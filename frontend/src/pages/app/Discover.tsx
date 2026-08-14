import { useMemo, useState, useEffect } from "react";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { ProjectCard } from "@/components/common/ProjectCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { projectsApi, type ProjectListQuery } from "@/lib/api/projects";
import { toProjectVM } from "@/lib/project-vm";

const FILTERS = {
  tech: ["React", "Python", "TypeScript", "Rust", "Solidity", "Next.js", "Node"],
  category: [
    "Healthcare",
    "Climate",
    "Education",
    "Developer Tools",
    "Civic Tech",
    "Research",
    "Agriculture",
  ],
  difficulty: ["beginner", "intermediate", "advanced"],
} as const;

type FilterKey = keyof typeof FILTERS;

export function Discover() {
  const search = useSearch({ strict: false }) as { q?: string };
  const navigate = useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [active, setActive] = useState<Record<FilterKey, Set<string>>>({
    tech: new Set(),
    category: new Set(),
    difficulty: new Set(),
  });
  const [sort, setSort] = useState<ProjectListQuery["sort"]>("newest");
  const [showFilters, setShowFilters] = useState(true);

  // Reflect ?q= in URL when the user types
  useEffect(() => {
    const handle = setTimeout(() => {
      navigate({
        to: "/discover",
        search: q ? { q } : {},
        replace: true,
      } as never);
    }, 300);
    return () => clearTimeout(handle);
  }, [q, navigate]);

  const toggle = (k: FilterKey, v: string) => {
    setActive((prev) => {
      const next = { ...prev };
      const set = new Set(next[k]);
      set.has(v) ? set.delete(v) : set.add(v);
      next[k] = set;
      return next;
    });
  };

  const params: ProjectListQuery = useMemo(() => {
    const p: ProjectListQuery = { sort, limit: 24 };
    if (q.trim()) p.q = q.trim();
    // Backend supports single-value filters; use first selected value per filter.
    if (active.category.size) p.category = Array.from(active.category)[0];
    if (active.difficulty.size) p.difficulty = Array.from(active.difficulty)[0];
    if (active.tech.size) p.tech = Array.from(active.tech).join(",");
    return p;
  }, [q, active, sort]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["projects", "discover", params],
    queryFn: () => projectsApi.list(params),
  });

  const results = (data?.data.items ?? []).map(toProjectVM);
  const totalActive = Object.values(active).reduce((n, s) => n + s.size, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Discover projects</h1>
        <p className="mt-1.5 text-muted-foreground">
          Filter by stack, hackathon, and more.
        </p>
      </motion.div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, tech, hackathons…"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters((s) => !s)} className="h-11">
          <SlidersHorizontal className="h-4 w-4" /> Filters{" "}
          {totalActive > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {totalActive}
            </span>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {showFilters && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filters</h3>
                {totalActive > 0 && (
                  <button
                    onClick={() =>
                      setActive({ tech: new Set(), category: new Set(), difficulty: new Set() })
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <div className="space-y-5">
                {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
                  <div key={k}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {k}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {FILTERS[k].map((v) => {
                        const on = active[k].has(v);
                        return (
                          <button
                            key={v}
                            onClick={() => toggle(k, v)}
                            className={`rounded-md border px-2 py-1 text-xs font-medium capitalize transition ${
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div>
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{results.length}</span> projects
              {isFetching && !isLoading && (
                <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
              )}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ProjectListQuery["sort"])}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="views">Most viewed</option>
              <option value="bookmarks">Most bookmarked</option>
            </select>
          </div>
          {isLoading ? (
            <div className="grid place-items-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="No projects match"
              desc="Try clearing a filter or searching a different keyword."
              actionLabel="Clear filters"
              onAction={() => {
                setActive({ tech: new Set(), category: new Set(), difficulty: new Set() });
                setQ("");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}