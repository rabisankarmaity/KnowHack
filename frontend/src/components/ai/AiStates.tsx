import { RefreshCw, WifiOff, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AiSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" style={{ width: `${95 - i * 8}%` }} />
      ))}
    </div>
  );
}

export function AiRetryState({
  title = "AI analysis failed",
  description,
  onRetry,
  retrying,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          {description && <p className="mt-1 text-muted-foreground">{description}</p>}
          <Button size="sm" variant="outline" className="mt-3" onClick={onRetry} disabled={retrying}>
            <RefreshCw className={retrying ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            {retrying ? "Retrying…" : "Retry analysis"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AiOfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm">
      <div className="flex items-start gap-2">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <p className="font-medium">AI service is offline</p>
          <p className="mt-1 text-muted-foreground">
            Case file content is still fully available. AI insights will appear once the service is
            reachable again.
          </p>
          {onRetry && (
            <Button size="sm" variant="ghost" className="mt-2 px-0" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" /> Check again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const STAGES = ["Reading files", "Extracting case file", "Generating summary", "Indexing & matching"];

export function AiProcessingProgress({ stage = 0 }: { stage?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full gradient-bg transition-all duration-700"
          style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {STAGES.map((s, i) => (
          <li key={s} className={i <= stage ? "text-foreground" : undefined}>
            {i < stage ? "✓" : i === stage ? "…" : "·"} {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
