import { useState, useCallback, useEffect, useRef } from "react";
import type { PaymentEntry } from "@/components/PaymentLog";

interface AgentState {
  isRunning: boolean;
  walletBalance: number | null;
  xlmWalletBalance: number | null;
  xlmPrice: string | null;
  payments: PaymentEntry[];
  briefingText: string;
  totalSpent: number;
  txCount: number;
}

export function useAgentStream() {
  const [state, setState] = useState<AgentState>({
    isRunning: false,
    walletBalance: null,
    xlmWalletBalance: null,
    xlmPrice: null,
    payments: [],
    briefingText: "",
    totalSpent: 0,
    txCount: 0,
  });
  const idCounter = useRef(0);
  const agentBaseUrl =
    import.meta.env.VITE_AGENT_API_URL || "http://localhost:3001";

  const hydrateFromBackendResult = useCallback(
    (
      result: {
        briefing?: string;
        payments?: Array<{
          endpoint?: string;
          amount?: string;
          txHash?: string | null;
          stellarExpertUrl?: string | null;
        }>;
        totalSpent?: string;
        walletBalance?: {
          balances?: Array<{
            asset?: string;
            balance?: string;
          }>;
        };
        sourceData?: {
          marketPrice?: {
            priceUsd?: number | null;
          };
        };
      },
      options?: {
        includeBriefing?: boolean;
        includePayments?: boolean;
      },
    ) => {
      const usdcBalance = result.walletBalance?.balances?.find(
        (balance) => balance.asset === "USDC",
      );
      const xlmBalance = result.walletBalance?.balances?.find(
        (balance) => balance.asset === "XLM",
      );
      const xlmPriceValue = result.sourceData?.marketPrice?.priceUsd;
      const totalSpentValue = result.totalSpent
        ? Number.parseFloat(result.totalSpent.replace(/[^0-9.]/g, ""))
        : 0;
      const payments: PaymentEntry[] = (result.payments ?? []).map((payment) => ({
        id: String(++idCounter.current),
        endpoint: payment.endpoint ?? "unknown",
        amount: payment.amount ?? "$0.01 USDC",
        txHash: payment.txHash ?? undefined,
        stellarExpertUrl: payment.stellarExpertUrl ?? undefined,
      }));

      setState((s) => ({
        ...s,
        walletBalance: usdcBalance?.balance ? Number(usdcBalance.balance) : 0,
        xlmWalletBalance: xlmBalance?.balance ? Number(xlmBalance.balance) : 0,
        xlmPrice:
          typeof xlmPriceValue === "number" ? xlmPriceValue.toFixed(4) : s.xlmPrice,
        payments: options?.includePayments === false ? s.payments : payments,
        briefingText:
          options?.includeBriefing === false ? s.briefingText : result.briefing ?? "",
        totalSpent:
          options?.includePayments === false
            ? s.totalSpent
            : Number.isFinite(totalSpentValue)
              ? totalSpentValue
              : 0,
        txCount: options?.includePayments === false ? s.txCount : payments.length,
      }));
    },
    [],
  );

  useEffect(() => {
    async function loadInitialStatus() {
      try {
        const res = await fetch(`${agentBaseUrl}/status`);

        if (!res.ok) {
          return;
        }

        const result = (await res.json()) as {
          walletBalance?: {
            balances?: Array<{
              asset?: string;
              balance?: string;
            }>;
          };
          sourceData?: {
            marketPrice?: {
              priceUsd?: number | null;
            };
          };
        };

        hydrateFromBackendResult(result, {
          includeBriefing: false,
          includePayments: false,
        });
      } catch {
        // Ignore initial status failures; run-agent will surface actionable errors.
      }
    }

    void loadInitialStatus();
  }, [agentBaseUrl, hydrateFromBackendResult]);

  const runAgent = useCallback(async (query: string) => {
    setState((s) => ({
      ...s,
      isRunning: true,
      payments: [],
      briefingText: "",
      totalSpent: 0,
      txCount: 0,
    }));

    try {
      const res = await fetch(`${agentBaseUrl}/run-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error("Failed to connect to agent backend");
      }
      const result = (await res.json()) as Parameters<
        typeof hydrateFromBackendResult
      >[0];
      hydrateFromBackendResult(result);
    } catch (err) {
      setState((s) => ({
        ...s,
        briefingText: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      }));
    } finally {
      setState((s) => ({ ...s, isRunning: false }));
    }
  }, [agentBaseUrl, hydrateFromBackendResult]);

  return { ...state, runAgent };
}
