import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Star,
  Bookmark,
  Flame,
  Calendar,
  ArrowRight,
  Trophy,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { ProjectCard } from "@/components/common/ProjectCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { EmptyState } from "@/components/common/EmptyState";
import { Progress } from "@/components/ui/progress";
import { projectsApi } from "@/lib/api/projects";
import { usersApi } from "@/lib/api/users";
import { bookmarksApi } from "@/lib/api/bookmarks";
import { hackathonsApi } from "@/lib/api/hackathons";
import { toProjectVM, initials, fallbackCover } from "@/lib/project-vm";
import { useAuth } from "@/context/AuthContext";
import type { ProjectDTO } from "@/lib/api/types";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const trendingQ = useQuery({
    queryKey: ["projects", "trending"],
    queryFn: () => projectsApi.list({ sort: "views", limit: 6 }),
  });
  const recentQ = useQuery({
    queryKey: ["projects", "recent"],
    queryFn: () => projectsApi.list({ sort: "newest", limit: 6 }),
  });
  const myQ = useQuery({
    queryKey: ["users", "myProjects"],
    queryFn: () => usersApi.myProjects(),
  });
  const bookmarksQ = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => bookmarksApi.list(),
  });
  const hackathonsQ = useQuery({
    queryKey: ["hackathons"],
    queryFn: () => hackathonsApi.list({ limit: 4 }),
  });

  const trending = (trendingQ.data?.data.items ?? []).map(toProjectVM);
  const recent = (recentQ.data?.data.items ?? []).slice(0, 3);
  const myProjects = myQ.data?.data.items ?? [];
  const bookmarkItems = bookmarksQ.data?.data.items ?? [];
  const hackathons = hackathonsQ.data?.data.items ?? [];

  const contribution = user?.contributionScore ?? 0;
  const avatarLabel = (user?.avatar || initials(user?.name)).slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:p-8"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-primary">Welcome back</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Hey {user?.name?.split(" ")[0] || "builder"} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              You've contributed {myProjects.length} project{myProjects.length === 1 ? "" : "s"} so far.
              Keep building — {trending.length} trending projects are waiting for you.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/upload"
                className="inline-flex items-center gap-1 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-elegant hover:opacity-95"
              >
                Upload a project <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/discover"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Discover
              </Link>
            </div>
          </div>
          <div className="hidden shrink-0 md:block">
            <div className="grid h-32 w-32 place-items-center rounded-2xl gradient-bg text-4xl font-bold text-white shadow-elegant">
              {avatarLabel}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Your projects" value={myProjects.length} icon={BookOpen} index={0} />
        <StatCard label="Stars earned" value={sum(myProjects.map((p) => p.likes ?? 0))} icon={Star} index={1} />
        <StatCard label="Bookmarks" value={bookmarkItems.length} icon={Bookmark} index={2} />
        <StatCard label="Contribution" value={contribution} icon={Flame} index={3} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Trending */}
          <section>
            <SectionHeading
              title="Trending"
              desc="What builders are viewing this week."
              action="See more"
              actionTo="/discover"
            />
            {trendingQ.isLoading ? (
              <LoaderBlock />
            ) : trending.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {trending.slice(0, 6).map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No projects yet"
                desc="Be the first to upload a project and it'll show up here."
                actionLabel="Upload a project"
                onAction={() => navigate({ to: "/upload" })}
              />
            )}
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <SectionHeading title="Recent projects" />
              <div className="space-y-3">
                {recent.map((p) => (
                  <MiniProjectRow key={p._id} p={p} />
                ))}
                {!recent.length && !recentQ.isLoading && (
                  <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
                    Nothing published yet.
                  </div>
                )}
              </div>
            </section>
            <section>
              <SectionHeading title="Your bookmarks" action="View all" actionTo="/discover" />
              <div className="space-y-3">
                {bookmarkItems.slice(0, 3).map((b) => {
                  const p = typeof b.projectId === "object" ? b.projectId : null;
                  if (!p) return null;
                  return <MiniProjectRow key={b._id} p={p} />;
                })}
                {!bookmarkItems.length && !bookmarksQ.isLoading && (
                  <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
                    Bookmark a project to keep track of it here.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Contribution progress</h3>
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div className="text-3xl font-semibold tracking-tight">
                {contribution}
                <span className="text-base text-muted-foreground">/100</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {myProjects.length} project{myProjects.length === 1 ? "" : "s"}
              </div>
            </div>
            <Progress value={Math.min(contribution, 100)} className="mt-3 h-2" />
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Upcoming hackathons</h3>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 space-y-3">
              {hackathonsQ.isLoading ? (
                <LoaderBlock />
              ) : hackathons.length ? (
                hackathons.map((h) => (
                  <div key={h._id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 text-xs font-semibold text-primary">
                      {(h.date || "TBD").slice(0, 3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{h.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[h.date, h.location].filter(Boolean).join(" · ") || "Date TBA"}
                      </div>
                    </div>
                    {h.prize && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {h.prize}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">No hackathons listed yet.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

function LoaderBlock() {
  return (
    <div className="grid place-items-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function MiniProjectRow({ p }: { p: ProjectDTO }) {
  const cover = p.coverImage || p.thumbnail || fallbackCover(p.slug);
  const ownerName =
    typeof p.owner === "object" && p.owner?.name ? p.owner.name : "Unknown";
  return (
    <Link
      to="/projects/$id"
      params={{ id: p.slug }}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition hover:border-primary/40 hover:shadow-card"
    >
      <div
        className="h-11 w-11 shrink-0 rounded-lg bg-cover bg-center"
        style={{ background: p.coverImage || p.thumbnail ? `center / cover no-repeat url("${cover}")` : cover }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{p.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {ownerName}
          {p.hackathonName ? ` · ${p.hackathonName}` : ""}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}