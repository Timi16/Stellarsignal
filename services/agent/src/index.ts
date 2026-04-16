import dotenv from "dotenv";
import express from "express";
import { Horizon, Keypair } from "@stellar/stellar-sdk";
import {
  decodePaymentResponseHeader,
  wrapFetchWithPaymentFromConfig,
} from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
});

const NETWORK = "stellar:testnet";
const DEFAULT_PORT = 3001;
const PRICE_PER_ENDPOINT = 0.01;
const STELLAR_EXPERT_TESTNET_BASE = "https://stellar.expert/explorer/testnet/tx";
const COINGECKO_DEMO_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true";
const COINGECKO_PRO_PRICE_URL =
  "https://pro-api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true";
const MARKET_PRICE_CACHE_TTL_MS = 30_000;

type JsonObject = Record<string, unknown>;

type PaymentRecord = {
  endpoint: string;
  amount: string;
  txHash: string | null;
  stellarExpertUrl: string | null;
};

let cachedMarketPrice:
  | {
      expiresAt: number;
      value: JsonObject;
    }
  | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildExplorerUrl(txHash: string | null): string | null {
  if (!txHash) {
    return null;
  }

  return `${STELLAR_EXPERT_TESTNET_BASE}/${txHash}`;
}

async function createPaidFetcher() {
  const rpcUrl = getRequiredEnv("STELLAR_RPC_URL");
  const secretKey = getRequiredEnv("AGENT_STELLAR_SECRET_KEY");
  const signer = createEd25519Signer(secretKey, NETWORK);
  const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      {
        network: "stellar:*",
        client: new ExactStellarScheme(signer, { url: rpcUrl }),
      },
    ],
  });

  return async function paidFetchJson(
    url: string,
  ): Promise<{ body: JsonObject; payment: PaymentRecord }> {
    const paidResponse = await fetchWithPayment(url, {
      method: "GET",
    });

    if (!paidResponse.ok) {
      const body = await paidResponse.text();
      throw new Error(
        `Paid request failed for ${url}: ${paidResponse.status} ${body}`,
      );
    }

    const body = (await paidResponse.json()) as JsonObject;
    const paymentHeader = paidResponse.headers.get("payment-response");
    const paymentResponse = paymentHeader
      ? decodePaymentResponseHeader(paymentHeader)
      : null;
    const txHash =
      paymentResponse && typeof paymentResponse.transaction === "string"
        ? paymentResponse.transaction
        : null;

    return {
      body,
      payment: {
        endpoint: new URL(url).pathname,
        amount: "$0.01 USDC",
        txHash,
        stellarExpertUrl: buildExplorerUrl(txHash),
      },
    };
  };
}

async function fetchCoinGeckoPrice(): Promise<JsonObject> {
  if (cachedMarketPrice && cachedMarketPrice.expiresAt > Date.now()) {
    return cachedMarketPrice.value;
  }

  const demoApiKey = process.env.CG_API_KEY ?? process.env.COINGECKO_API_KEY;
  const proApiKey = process.env.COINGECKO_PRO_API_KEY;
  const response = await fetch(
    proApiKey ? COINGECKO_PRO_PRICE_URL : COINGECKO_DEMO_PRICE_URL,
    {
      headers: proApiKey
        ? {
            "x-cg-pro-api-key": proApiKey,
          }
        : demoApiKey
          ? {
              "x-cg-demo-api-key": demoApiKey,
            }
          : undefined,
    },
  );

  if (!response.ok) {
    if (cachedMarketPrice) {
      return cachedMarketPrice.value;
    }

    const body = await response.text();
    throw new Error(`CoinGecko request failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    stellar?: {
      usd?: number;
      usd_24h_change?: number;
      last_updated_at?: number;
    };
  };
  const price = payload.stellar;

  const result = {
    asset: "XLM",
    source: "CoinGecko",
    priceUsd: price?.usd ?? null,
    change24hPct: price?.usd_24h_change ?? null,
    lastUpdatedAt:
      typeof price?.last_updated_at === "number"
        ? new Date(price.last_updated_at * 1000).toISOString()
        : null,
  };

  cachedMarketPrice = {
    expiresAt: Date.now() + MARKET_PRICE_CACHE_TTL_MS,
    value: result,
  };

  return result;
}

async function fetchWalletBalance(): Promise<JsonObject> {
  const horizonUrl = getRequiredEnv("STELLAR_HORIZON_URL");
  const publicKey = Keypair.fromSecret(
    getRequiredEnv("AGENT_STELLAR_SECRET_KEY"),
  ).publicKey();
  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(publicKey);
  const balances = account.balances.map((balance) => {
    if (balance.asset_type === "native") {
      return { asset: "XLM", balance: balance.balance };
    }

    return {
      asset:
        "asset_code" in balance && typeof balance.asset_code === "string"
          ? balance.asset_code
          : balance.asset_type,
      issuer:
        "asset_issuer" in balance && typeof balance.asset_issuer === "string"
          ? balance.asset_issuer
          : null,
      balance: balance.balance,
    };
  });

  return {
    account: publicKey,
    balances,
  };
}

async function createBriefing(input: {
  query: string;
  marketPrice: JsonObject;
  priceAnalysis: JsonObject;
  sentimentAnalysis: JsonObject;
  signalAnalysis: JsonObject;
}): Promise<string> {
  const togetherApiKey = getRequiredEnv("TOGETHER_API_KEY");
  const model =
    process.env.TOGETHER_MODEL ?? "meta-llama/Llama-3-70b-instruct";

  const response = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${togetherApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a crypto market analyst. Produce a concise trading briefing with risk caveats, not financial advice.",
        },
        {
          role: "user",
          content: JSON.stringify(input, null, 2),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Together API request failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return (
    payload.choices?.[0]?.message?.content?.trim() ??
    "No briefing returned by Together AI."
  );
}

const app = express();
const port = Number(process.env.AGENT_PORT ?? DEFAULT_PORT);

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (_req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    service: "stellarsignal-agent",
    port,
    network: NETWORK,
    endpoint: "/run-agent",
  });
});

app.get("/status", async (_req, res) => {
  try {
    const walletBalance = await fetchWalletBalance();
    const marketPrice = await fetchCoinGeckoPrice();

    return res.json({
      service: "stellarsignal-agent",
      network: NETWORK,
      walletBalance,
      sourceData: {
        marketPrice,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/run-agent", async (req, res) => {
  try {
    const query =
      typeof req.body?.query === "string" && req.body.query.trim().length > 0
        ? req.body.query.trim()
        : null;

    if (!query) {
      return res.status(400).json({ error: "Body must include query:string" });
    }

    const apiBaseUrl = getRequiredEnv("API_BASE_URL");
    const paidFetchJson = await createPaidFetcher();
    const marketPrice = await fetchCoinGeckoPrice();

    const priceResult = await paidFetchJson(
      new URL("/analyze/price", apiBaseUrl).toString(),
    );
    const sentimentResult = await paidFetchJson(
      new URL("/analyze/sentiment", apiBaseUrl).toString(),
    );
    const signalResult = await paidFetchJson(
      new URL("/analyze/signal", apiBaseUrl).toString(),
    );

    const briefing = await createBriefing({
      query,
      marketPrice,
      priceAnalysis: priceResult.body,
      sentimentAnalysis: sentimentResult.body,
      signalAnalysis: signalResult.body,
    });

    const payments = [
      priceResult.payment,
      sentimentResult.payment,
      signalResult.payment,
    ];

    return res.json({
      briefing,
      payments,
      totalSpent: `$${(payments.length * PRICE_PER_ENDPOINT).toFixed(2)} USDC`,
      walletBalance: await fetchWalletBalance(),
      sourceData: {
        marketPrice,
        priceAnalysis: priceResult.body,
        sentimentAnalysis: sentimentResult.body,
        signalAnalysis: signalResult.body,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(port, () => {
  console.log(`Agent listening on http://localhost:${port}`);
});
