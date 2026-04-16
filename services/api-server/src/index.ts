import dotenv from "dotenv";
import express from "express";
import { Keypair } from "@stellar/stellar-sdk";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
});

const NETWORK = "stellar:testnet" as const;
const PRICE = "$0.01";
const DEFAULT_PORT = 4021;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createFacilitatorClient(): HTTPFacilitatorClient {
  const facilitatorUrl = getRequiredEnv("X402_FACILITATOR_URL");
  const apiKey = getRequiredEnv("X402_FACILITATOR_API_KEY");

  const options = {
    url: facilitatorUrl,
    createAuthHeaders: async () => {
      const headers = { Authorization: `Bearer ${apiKey}` };

      return {
        verify: headers,
        settle: headers,
        supported: headers,
      };
    },
  } as ConstructorParameters<typeof HTTPFacilitatorClient>[0];

  return new HTTPFacilitatorClient(options);
}

const walletSecret = getRequiredEnv("API_STELLAR_SECRET_KEY");
const walletPublicKey = Keypair.fromSecret(walletSecret).publicKey();
const port = Number(process.env.API_PORT ?? DEFAULT_PORT);

const app = express();

const routeConfig: Parameters<typeof paymentMiddlewareFromConfig>[0] = {
  "GET /analyze/price": {
    accepts: {
      scheme: "exact" as const,
      price: PRICE,
      network: NETWORK,
      payTo: walletPublicKey,
    },
    description: "Mock XLM price analysis",
    mimeType: "application/json",
  },
  "GET /analyze/sentiment": {
    accepts: {
      scheme: "exact" as const,
      price: PRICE,
      network: NETWORK,
      payTo: walletPublicKey,
    },
    description: "Mock XLM market sentiment analysis",
    mimeType: "application/json",
  },
  "GET /analyze/signal": {
    accepts: {
      scheme: "exact" as const,
      price: PRICE,
      network: NETWORK,
      payTo: walletPublicKey,
    },
    description: "Mock XLM trading signal",
    mimeType: "application/json",
  },
};

app.use(express.json());
app.use(
  paymentMiddlewareFromConfig(routeConfig, createFacilitatorClient(), [
    {
      network: NETWORK,
      server: new ExactStellarScheme(),
    },
  ]),
);

app.get("/", (_req, res) => {
  res.json({
    service: "stellarsignal-api",
    network: NETWORK,
    pricePerEndpoint: PRICE,
    payTo: walletPublicKey,
    endpoints: Object.keys(routeConfig).map((route) => route.replace("GET ", "")),
  });
});

app.get("/analyze/price", (_req, res) => {
  res.json({
    asset: "XLM",
    asOf: new Date().toISOString(),
    analysis: "XLM is consolidating after a recent impulse higher.",
    trend: "bullish",
    support: 0.11,
    resistance: 0.126,
    confidence: 0.72,
  });
});

app.get("/analyze/sentiment", (_req, res) => {
  res.json({
    asset: "XLM",
    asOf: new Date().toISOString(),
    sentiment: "cautiously bullish",
    drivers: [
      "Steady on-chain activity",
      "Macro market risk appetite improving",
      "Short-term momentum still mixed",
    ],
    score: 64,
  });
});

app.get("/analyze/signal", (_req, res) => {
  res.json({
    asset: "XLM",
    asOf: new Date().toISOString(),
    signal: "buy",
    timeframe: "24h",
    entryZone: [0.112, 0.116],
    invalidation: 0.108,
    takeProfit: [0.123, 0.129],
    confidence: 0.68,
  });
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
