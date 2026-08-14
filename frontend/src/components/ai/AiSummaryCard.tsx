import { Sparkles } from "lucide-react";
import { AiStatusIndicator } from "./AiStatusIndicator";
import { AiOfflineState, AiProcessingProgress, AiRetryState, AiSkeleton } from "./AiStates";
import { Button } from "@/components/ui/button";
import type { AiInsights } from "@/lib/api/types";

export function AiSummaryCard({
  ai,
  loading,
  offline,
  canRetry,
  onRetry,
  retrying,
}: {
  ai?: AiInsights;
  loading?: boolean;
  offline?: boolean;
  canRetry?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const status = ai?.status ?? "idle";

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="h-4 w-4 text-primary" /> AI summary
        </h2>
        <AiStatusIndicator status={status} offline={offline} engine={ai?.engine} />
      </div>

      <div className="mt-4">
        {loading && <AiSkeleton />}
        {!loading && offline && <AiOfflineState onRetry={onRetry} />}
        {!loading && !offline && status === "processing" && <AiProcessingProgress stage={2} />}
        {!loading && !offline && status === "failed" && onRetry && (
          <AiRetryState description={ai?.error ?? undefined} onRetry={onRetry} retrying={retrying} />
        )}
        {!loading && !offline && status === "idle" && (
          <div className="text-sm text-muted-foreground">
            This case file hasn't been analysed yet.
            {canRetry && onRetry && (
              <Button size="sm" variant="outline" className="ml-3" onClick={onRetry} disabled={retrying}>
                {retrying ? "Analysing…" : "Run AI analysis"}
              </Button>
            )}
          </div>
        )}
        {!loading && !offline && status === "ready" && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{ai?.summary}</p>
            {(ai?.highlights?.length ?? 0) > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {ai!.highlights!.slice(0, 6).map((h, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/60 p-3 text-xs"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
            {(ai?.warnings?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                Note: {ai!.warnings!.join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}