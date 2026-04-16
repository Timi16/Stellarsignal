import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, CheckCircle2 } from "lucide-react";

export interface PaymentEntry {
  id: string;
  amount: string;
  destination: string;
  txHash?: string;
}

interface PaymentLogProps {
  payments: PaymentEntry[];
}

export function PaymentLog({ payments }: PaymentLogProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 border-b border-border">
        Live Payment Log
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence initial={false}>
          {payments.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No payments yet. Run the agent to start.
            </div>
          )}
          {payments.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary border border-border"
            >
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground font-mono">
                  Paid <span className="text-primary font-semibold">{p.amount} USDC</span> → {p.destination}
                </div>
                {p.txHash && (
                  <a
                    href={`https://stellar.expert/explorer/public/tx/${p.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Stellar Expert
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
