import dotenv from "dotenv";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

dotenv.config();

const USDC_TESTNET_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC_ASSET = new Asset("USDC", USDC_TESTNET_ISSUER);
const HORIZON_URL =
  process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getPublicKeyFromSecret(secret: string): string {
  return Keypair.fromSecret(secret).publicKey();
}

function hasUsdcTrustline(
  balances: Horizon.HorizonApi.BalanceLine[],
): boolean {
  return balances.some(
    (balance) =>
      balance.asset_type !== "native" &&
      "asset_code" in balance &&
      "asset_issuer" in balance &&
      balance.asset_code === "USDC" &&
      balance.asset_issuer === USDC_TESTNET_ISSUER,
  );
}

async function ensureUsdcTrustline(
  server: Horizon.Server,
  label: string,
  secret: string,
): Promise<void> {
  const keypair = Keypair.fromSecret(secret);
  const publicKey = keypair.publicKey();
  const account = await server.loadAccount(publicKey);

  if (hasUsdcTrustline(account.balances)) {
    console.log(`${label}: USDC trustline already exists for ${publicKey}`);
    return;
  }

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: USDC_ASSET,
      }),
    )
    .setTimeout(60)
    .build();

  transaction.sign(keypair);

  const result = await server.submitTransaction(transaction);
  console.log(
    `${label}: created USDC trustline for ${publicKey} in tx ${result.hash}`,
  );
}

async function main(): Promise<void> {
  const agentSecret = getRequiredEnv("AGENT_STELLAR_SECRET_KEY");
  const apiSecret = getRequiredEnv("API_STELLAR_SECRET_KEY");
  const server = new Horizon.Server(HORIZON_URL);

  const agentPublicKey = getPublicKeyFromSecret(agentSecret);
  const apiPublicKey = getPublicKeyFromSecret(apiSecret);

  console.log("Wallet public keys:");
  console.log(`- Agent wallet (payer): ${agentPublicKey}`);
  console.log(`- API wallet (receiver): ${apiPublicKey}`);
  console.log("");
  console.log("Circle faucet: https://faucet.circle.com");
  console.log("Select Stellar Testnet and request testnet USDC for both wallets.");
  console.log("The agent wallet must receive USDC so it can pay the API.");
  console.log("");

  await ensureUsdcTrustline(server, "Agent wallet", agentSecret);
  await ensureUsdcTrustline(server, "API wallet", apiSecret);

  console.log("");
  console.log("Next:");
  console.log("1. Open https://faucet.circle.com");
  console.log("2. Select Stellar Testnet");
  console.log(`3. Request USDC for agent wallet: ${agentPublicKey}`);
  console.log(`4. Optionally request USDC for API wallet: ${apiPublicKey}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
