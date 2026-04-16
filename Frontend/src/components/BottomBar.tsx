import { Activity, Hash } from "lucide-react";

interface BottomBarProps {
  totalSpent: number;
  txCount: number;
}

export function BottomBar({ totalSpent, txCount }: BottomBarProps) {
  return (
    <footer className="flex items-center justify-between px-6 py-3 border-t border-border text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Activity className="w-3.5 h-3.5 text-primary" />
        Total spent: <span className="text-foreground font-mono font-semibold">${totalSpent.toFixed(4)} USDC</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Hash className="w-3.5 h-3.5 text-primary" />
        Transactions: <span className="text-foreground font-mono font-semibold">{txCount}</span>
      </div>
    </footer>
  );
}
