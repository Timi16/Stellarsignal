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
      const res = await fetch("http://localhost:3001/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to connect to agent backend");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            handleEvent(event);
          } catch {
            // skip non-JSON lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          handleEvent(JSON.parse(buffer));
        } catch {
          // skip
        }
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        briefingText: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      }));
    } finally {
      setState((s) => ({ ...s, isRunning: false }));
    }

    function handleEvent(event: Record<string, unknown>) {
      const type = event.type as string;

      if (type === "balance") {
        setState((s) => ({
          ...s,
          walletBalance: Number(event.balance),
        }));
      } else if (type === "price") {
        setState((s) => ({
          ...s,
          xlmPrice: String(event.price),
        }));
      } else if (type === "payment") {
        const id = String(++idCounter.current);
        const amount = String(event.amount || "0.01");
        const destination = String(event.destination || "");
        const txHash = event.txHash ? String(event.txHash) : undefined;
        const amountNum = parseFloat(amount);

        setState((s) => ({
          ...s,
          payments: [...s.payments, { id, amount, destination, txHash }],
          totalSpent: s.totalSpent + (isNaN(amountNum) ? 0 : amountNum),
          txCount: s.txCount + 1,
        }));
      } else if (type === "briefing" || type === "text") {
        setState((s) => ({
          ...s,
          briefingText: s.briefingText + String(event.content || event.text || ""),
        }));
      } else if (type === "result") {
        setState((s) => ({
          ...s,
          briefingText: String(event.content || event.text || s.briefingText),
        }));
      }
    }
  }, []);

  return { ...state, runAgent };
}
