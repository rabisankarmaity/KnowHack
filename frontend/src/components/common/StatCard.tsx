import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  index = 0,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          {delta && <div className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{delta}</div>}
        </div>
        {Icon && (
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </motion.div>
  );
}