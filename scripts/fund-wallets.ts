import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";

dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function fundAccount(label: string, publicKey: string): Promise<void> {
  const response = await fetch(
    `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Friendbot failed for ${label}: ${response.status} ${body}`);
  }

  console.log(`Funded ${label}: ${publicKey}`);
}

async function main(): Promise<void> {
  const agentSecret = getRequiredEnv("AGENT_STELLAR_SECRET_KEY");
  const apiSecret = getRequiredEnv("API_STELLAR_SECRET_KEY");

  const agentPublicKey = Keypair.fromSecret(agentSecret).publicKey();
  const apiPublicKey = Keypair.fromSecret(apiSecret).publicKey();

  console.log("Funding testnet wallets with Stellar Friendbot...");
  await fundAccount("Wallet A / agent", agentPublicKey);
  await fundAccount("Wallet B / api-server", apiPublicKey);
  console.log("Done. Friendbot only funds XLM; add testnet USDC separately.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

