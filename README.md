# StellarSignal

Node.js/TypeScript monorepo with:

- `services/api-server` on port `4021` serving three `x402`-protected Stellar testnet endpoints
- `services/agent` on port `3001` that fetches free market data, auto-pays the API with `x402`, then asks Together AI for a trading briefing

## Services

### API Server

Paid endpoints:

- `GET /analyze/price`
- `GET /analyze/sentiment`
- `GET /analyze/signal`

Each endpoint costs `$0.01 USDC` on `stellar:testnet`.

### Agent

- Accepts `POST /run-agent`
- Gets the latest free XLM price snapshot from CoinGecko
- Calls the three paid API endpoints with `@x402/fetch`
- Calls Together AI to synthesize a briefing
- Returns:
  - `briefing`
  - `payments`
  - `totalSpent`
  - `walletBalance`

## Prerequisites

- Node.js 20+
- Bun 1.3+ or npm 10+
- An OpenZeppelin Channels x402 testnet facilitator API key
- A Together AI API key
- Two Stellar testnet secret keys:
  - Wallet A = agent payer wallet
  - Wallet B = API receiver wallet

## Setup

1. Install dependencies from the repo root:

   ```bash
   bun install
   ```

   `npm install` also works if you prefer npm.

2. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

3. Put your real secrets into `.env`:

   - `X402_FACILITATOR_API_KEY`
   - `API_STELLAR_SECRET_KEY`
   - `AGENT_STELLAR_SECRET_KEY`
   - `TOGETHER_API_KEY`

4. Fund both wallets with Friendbot:

   ```bash
   bun run fund-wallets
   ```

   Friendbot only adds testnet XLM. You still need a USDC trustline on both wallets, then testnet USDC for the agent wallet so it can pay the API.
   The Stellar docs point to Stellar Lab for trustlines and Circle Faucet for testnet USDC.

5. Start the API server:

   ```bash
   bun run dev:api
   ```

6. Start the agent in a second terminal:

   ```bash
   bun run dev:agent
   ```

7. Optional build check:

   ```bash
   bun run build
   ```

## Example request

```bash
curl -X POST http://localhost:3001/run-agent \
  -H "Content-Type: application/json" \
  -d '{"query":"Give me an XLM trading briefing for the next 24 hours"}'
```

## Workspace layout

```text
.
├── package.json
├── scripts/fund-wallets.ts
└── services
    ├── agent
    │   └── src/index.ts
    └── api-server
        └── src/index.ts
```

## Notes

- The API server loads the OpenZeppelin facilitator URL and API key from `.env`.
- The agent uses the same Stellar testnet network and auto-pays the API via `x402`.
- The agent uses `wrapFetchWithPaymentFromConfig` from `@x402/fetch` for auto-payment and reads the `PAYMENT-RESPONSE` header to report settlement details.
- The Together model defaults to `meta-llama/Llama-3-70b-instruct`, but you can swap `TOGETHER_MODEL` if your Together account requires a different model name.
- `scripts/fund-wallets.ts` derives the public keys from the two secret keys and funds both accounts through Stellar Friendbot.
