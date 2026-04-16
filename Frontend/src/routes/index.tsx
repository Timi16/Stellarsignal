import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StellarHeader } from "@/components/StellarHeader";
import { AgentPanel } from "@/components/AgentPanel";
import { PaymentLog } from "@/components/PaymentLog";
import { AgentBriefing } from "@/components/AgentBriefing";
import { BottomBar } from "@/components/BottomBar";
import { useAgentStream } from "@/hooks/useAgentStream";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "StellarSignal — Crypto Agent Dashboard" },
      { name: "description", content: "AI-powered Stellar blockchain agent dashboard with real-time payments and analysis." },
    ],
  }),
});

function Dashboard() {
  const [query, setQuery] = useState("");
  const {
    isRunning,
    walletBalance,
    xlmWalletBalance,
    xlmPrice,
    payments,
    briefingText,
    totalSpent,
    txCount,
    runAgent,
  } = useAgentStream();

  const handleRun = () => {
    if (query.trim() && !isRunning) {
      runAgent(query.trim());
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <StellarHeader
        usdcBalance={walletBalance}
        xlmBalance={xlmWalletBalance}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left Panel */}
        <div className="w-[40%] border-r border-border">
          <AgentPanel
            query={query}
            onQueryChange={setQuery}
            onRun={handleRun}
            isRunning={isRunning}
            xlmPrice={xlmPrice}
          />
        </div>

        {/* Right Panel */}
        <div className="w-[60%] flex flex-col">
          <div className="h-1/2 border-b border-border overflow-hidden">
            <PaymentLog payments={payments} />
          </div>
          <div className="h-1/2 overflow-hidden">
            <AgentBriefing text={briefingText} isThinking={isRunning} />
          </div>
        </div>
      </div>

      <BottomBar totalSpent={totalSpent} txCount={txCount} />
    </div>
  );
}
