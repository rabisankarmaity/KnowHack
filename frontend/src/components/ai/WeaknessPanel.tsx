import { useState } from "react";
import { ShieldAlert, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api/ai";
import { apiErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import type { WeaknessReportDTO, WeaknessState, WeaknessItemDTO } from "@/lib/api/types";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "text-red-500 border-red-500/30 bg-red-500/10",
  high: "text-orange-500 border-orange-500/30 bg-orange-500/10",
  medium: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  low: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        SEVERITY_STYLE[severity] || SEVERITY_STYLE.low
      }`}
    >
      {severity}
    </span>
  );
}

function WeaknessCard({ w }: { w: WeaknessItemDTO }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold capitalize">
          <span className="text-muted-foreground">{w.category}:</span> {w.title}
        </div>
        <div className="flex items-center gap-1.5">
          <SeverityBadge severity={w.severity} />
          <span className="text-[10px] text-muted-foreground">{w.priority} priority</span>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Evidence:</span> {w.evidence}
      </p>
      {w.why_it_matters && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Why it matters:</span> {w.why_it_matters}
        </p>
      )}
      {w.recommended_action && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Recommended:</span> {w.recommended_action}
        </p>
      )}
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((t) => (
          <span
            key={t}
            className="rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Project Weakness / Mistake Detector — System 1.
 * Persistent results are kept on the project via `ai.weakness` and can be served
 * as a stale snapshot if the AI service is temporarily unavailable.
 */
export function WeaknessPanel({
  projectId,
  canRun,
  weakness,
  loading,
}: {
  projectId: string;
  canRun?: boolean;
  weakness?: WeaknessState;
  loading?: boolean;
}) {
  const [localReport, setLocalReport] = useState<WeaknessReportDTO | null>(null);
  const [running, setRunning] = useState(false);
  const [stale, setStale] = useState(false);

  const report = localReport ?? weakness?.report ?? null;
  const engine = localReport ? undefined : weakness?.engine;

  const run = async () => {
    if (!canRun || running) return;
    setRunning(true);
    try {
      const res = await aiApi.weakness(projectId);
      setLocalReport(res.data.weakness.report ?? null);
      setStale(res.data.stale);
      toast.success(
        res.data.stale ? "Showing the last saved report" : "Weakness analysis complete",
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Weakness analysis failed"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ShieldAlert className="h-4 w-4 text-primary" /> Weakness report
        </h2>
        {report && <SeverityBadge severity={report.severity} />}
        {canRun && (
          <Button variant="outline" size="sm" onClick={run} disabled={running || loading}>
            {running ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {report ? "Re-run" : "Run weakness analysis"}
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Pre-submission review that finds mistakes, missing evidence and scope risks in your Case
        File. Findings cite evidence — gaps are marked <em>Not documented</em>.
      </p>

      {(loading || running) && !report && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Analysing the case file…
        </div>
      )}

      {!report && !loading && !running && !canRun && (
        <p className="mt-4 text-sm text-muted-foreground">
          No weakness report yet for this case file.
        </p>
      )}

      {report && (
        <div className="mt-4 space-y-4">
          {stale && (
            <p className="text-[11px] text-muted-foreground">
              Showing the last saved report — the AI service is temporarily unavailable.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
            <div className="relative grid h-16 w-16 place-items-center">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={
                    report.overall_score >= 75
                      ? "var(--emerald-500)"
                      : report.overall_score >= 50
                        ? "var(--amber-500)"
                        : "var(--red-500)"
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${report.overall_score}, 100`}
                />
              </svg>
              <span className="absolute text-base font-bold">{report.overall_score}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Case File score · /100</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.summary}</p>
            </div>
            {engine && <span className="text-[10px] text-muted-foreground">engine: {engine}</span>}
          </div>

          <ListBlock label="Strengths" items={report.strengths.slice(0, 4)} />
          <ListBlock label="Missing sections" items={report.missing_sections} />

          {report.weaknesses.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Weaknesses found ({report.weaknesses.length})
              </div>
              {report.weaknesses.map((w, i) => (
                <WeaknessCard key={i} w={w} />
              ))}
            </div>
          )}

          {report.before_submission.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Before you submit
              </div>
              <ul className="mt-1.5 space-y-1">
                {report.before_submission.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.technical_risks.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Technical & security risks
              </div>
              <ul className="mt-1.5 space-y-1">
                {[...report.technical_risks, ...report.security_risks].map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
