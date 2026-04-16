import { Send, Loader2 } from "lucide-react";

interface AgentPanelProps {
  query: string;
  onQueryChange: (val: string) => void;
  onRun: () => void;
  isRunning: boolean;
  xlmPrice: string | null;
}

export function AgentPanel({ query, onQueryChange, onRun, isRunning, xlmPrice }: AgentPanelProps) {
  return (
    <div className="flex flex-col gap-5 p-6 h-full">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Agent Query
        </label>
        <textarea
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Ask about XLM..."
          className="w-full h-28 bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring font-sans"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey && !isRunning) onRun();
          }}
        />
      </div>

      <button
        onClick={onRun}
        disabled={isRunning || !query.trim()}
        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed glow-primary"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Run Agent
          </>
        )}
      </button>

      <div className="mt-auto p-4 rounded-lg bg-secondary border border-border">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">XLM Price</div>
        <div className="text-2xl font-mono font-bold text-foreground">
          {xlmPrice ? `$${xlmPrice}` : "—"}
        </div>
      </div>
    </div>
  );
}
