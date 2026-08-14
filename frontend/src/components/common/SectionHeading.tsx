import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  desc,
  action,
  actionTo,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  action?: string;
  actionTo?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {desc && <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{desc}</p>}
      </div>
      {action && actionTo && (
        <Link to={actionTo} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80">
          {action} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}