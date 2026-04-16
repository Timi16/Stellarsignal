import { Zap } from "lucide-react";

interface StellarHeaderProps {
  walletBalance: number | null;
}

export function StellarHeader({ walletBalance }: StellarHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Stellar<span className="text-primary">Signal</span>
        </h1>
      </div>
      <div className="px-4 py-1.5 rounded-full bg-secondary border border-border text-sm font-mono">
        Wallet:{" "}
        <span className="text-primary font-semibold">
          {walletBalance !== null ? `$${walletBalance.toFixed(2)}` : "—"} USDC
        </span>
      </div>
    </header>
  );
}
