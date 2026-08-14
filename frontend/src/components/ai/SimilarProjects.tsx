import { Link } from "@tanstack/react-router";
import { GitCompareArrows } from "lucide-react";
import { AiOfflineState, AiSkeleton } from "./AiStates";
import { fallbackCover } from "@/lib/project-vm";
import type { SimilarProjectDTO } from "@/lib/api/types";

export function SimilarProjects({
  items,
  loading,
  offline,
  stale,
  onRetry,
}: {
  items?: SimilarProjectDTO[];
  loading?: boolean;
  offline?: boolean;
  stale?: boolean;
  onRetry?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <GitCompareArrows className="h-4 w-4 text-primary" /> Similar projects
      </h3>

      <div className="mt-4">
        {loading && <AiSkeleton lines={3} />}
        {!loading && offline && <AiOfflineState onRetry={onRetry} />}
        {!loading && !offline && !items?.length && (
          <p className="text-xs text-muted-foreground">
            No similar case files yet — this project is charting new territory.
          </p>
        )}
        {!loading && !offline && !!items?.length && (
          <div className="space-y-2">
            {items.map((p) => {
              const cover = p.coverImage || p.thumbnail;
              return (
                <Link
                  key={p._id}
                  to="/projects/$id"
                  params={{ id: p.slug }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-2 transition hover:border-primary/40"
                >
                  <div
                    className="h-10 w-14 shrink-0 overflow-hidden rounded-lg"
                    style={cover ? undefined : { background: fallbackCover(p.slug) }}
                  >
                    {cover && <img src={cover} alt={p.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{p.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {p.hackathonName || p.category || "Case file"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {Math.round((p.score ?? 0) * 100)}%
                  </span>
                </Link>
              );
            })}
            {stale && (
              <p className="pt-1 text-[11px] text-muted-foreground">
                Showing the last saved matches — AI service is temporarily unavailable.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}