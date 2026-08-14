import { Loader2, Sparkles, TriangleAlert, WifiOff, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiStatus } from "@/lib/api/types";

export function AiStatusIndicator({
  status,
  offline,
  engine,
  className,
}: {
  status: AiStatus;
  offline?: boolean;
  engine?: string;
  className?: string;
}) {
  const map = {
    offline: { icon: WifiOff, label: "AI offline", tone: "bg-muted text-muted-foreground" },
    processing: { icon: Loader2, label: "AI analysing", tone: "bg-primary/10 text-primary" },
    ready: { icon: Sparkles, label: "AI ready", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    failed: { icon: TriangleAlert, label: "AI unavailable", tone: "bg-destructive/10 text-destructive" },
    idle: { icon: CircleDashed, label: "AI not run", tone: "bg-muted text-muted-foreground" },
  } as const;

  const key = offline ? "offline" : status;
  const { icon: Icon, label, tone } = map[key];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", key === "processing" && "animate-spin")} />
      {label}
      {key === "ready" && engine === "fallback" && (
        <span className="opacity-70">· basic engine</span>
      )}
    </span>
  );
}