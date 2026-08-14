import { Brain } from "lucide-react";
import { AiSkeleton } from "./AiStates";
import type { AiInsights } from "@/lib/api/types";

function Chips({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((t) => (
          <span key={t} className="rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px]">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Block({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <p className="mt-1 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

export function AiInsightsPanel({ ai, loading }: { ai?: AiInsights; loading?: boolean }) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <AiSkeleton lines={5} />
      </section>
    );
  }
  if (!ai || ai.status !== "ready") return null;

  const t = ai.techStack || {};
  const detected = [
    ...(t.languages ?? []),
    ...(t.frameworks ?? []),
    ...(t.databases ?? []),
    ...(t.cloud ?? []),
    ...(t.tools ?? []),
  ];

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Brain className="h-4 w-4 text-primary" /> AI insights
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Block label="Problem" value={ai.caseFile?.problem} />
        <Block label="Target users" value={ai.caseFile?.target_users} />
        <Block label="Solution" value={ai.caseFile?.solution} />
        <Block label="Innovation" value={ai.caseFile?.innovation} />
        <Block label="Research" value={ai.caseFile?.research} />
        <Block label="Architecture" value={ai.caseFile?.architecture} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Chips label="Detected tech stack" items={detected} />
        <Chips label="Keywords" items={ai.metadata?.keywords} />
      </div>

      <div className="mt-5 flex flex-wrap gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        {ai.sector && (
          <span>
            Sector: <strong className="text-foreground capitalize">{ai.sector}</strong>
          </span>
        )}
        {ai.metadata?.difficulty && (
          <span>
            Difficulty: <strong className="text-foreground capitalize">{ai.metadata.difficulty}</strong>
          </span>
        )}
        {ai.model && <span>Model: {ai.model}</span>}
      </div>
    </section>
  );
}