import { useState, useCallback, useRef } from "react";
import type { PaymentEntry } from "@/components/PaymentLog";

interface AgentState {
  isRunning: boolean;
  walletBalance: number | null;
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
    xlmPrice: null,
    payments: [],
    briefingText: "",
    totalSpent: 0,
    txCount: 0,
  });
  const idCounter = useRef(0);

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
      const agentBaseUrl = import.meta.env.VITE_AGENT_API_URL || "/api";
      const res = await fetch(`${agentBaseUrl}/run-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error("Failed to connect to agent backend");
      }
      const result = (await res.json()) as {
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
      };

      const usdcBalance = result.walletBalance?.balances?.find(
        (balance) => balance.asset === "USDC",
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
        walletBalance: usdcBalance?.balance ? Number(usdcBalance.balance) : s.walletBalance,
        xlmPrice:
          typeof xlmPriceValue === "number" ? xlmPriceValue.toFixed(4) : s.xlmPrice,
        payments,
        briefingText: result.briefing ?? "",
        totalSpent: Number.isFinite(totalSpentValue) ? totalSpentValue : 0,
        txCount: payments.length,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        briefingText: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      }));
    } finally {
      setState((s) => ({ ...s, isRunning: false }));
    }
  }, []);

  return { ...state, runAgent };
}
