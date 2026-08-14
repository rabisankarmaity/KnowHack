import { Link } from "@tanstack/react-router";

export function Logo({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="group flex items-center gap-2">
      <img
        src={compact ? "/logo-mark.svg" : "/logo.svg"}
        alt="KnowHack"
        width={compact ? 36 : undefined}
        height={compact ? 36 : 28}
        className="shrink-0 object-contain transition-transform group-hover:scale-105"
      />
    </Link>
  );
}