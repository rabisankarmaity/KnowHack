import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Calendar, Link as LinkIcon, Github, Loader2, Award } from "lucide-react";
import { ProjectCard } from "@/components/common/ProjectCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/context/AuthContext";
import { initials, toProjectVM } from "@/lib/project-vm";
import { Link } from "@tanstack/react-router";

export function Profile() {
  const { user } = useAuth();
  const projectsQ = useQuery({
    queryKey: ["users", "myProjects"],
    queryFn: () => usersApi.myProjects(),
  });

  const projects = (projectsQ.data?.data.items ?? []).map(toProjectVM);
  const contribution = user?.contributionScore ?? 0;
  const avatarLabel = (user?.avatar || initials(user?.name)).slice(0, 2).toUpperCase();
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card"
      >
        <div className="relative h-40 gradient-bg sm:h-56">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
        </div>
        <div className="relative px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card gradient-bg text-2xl font-bold text-white shadow-elegant sm:h-28 sm:w-28 sm:text-3xl">
              {avatarLabel}
            </div>
            <div className="ml-auto flex gap-2">
              <Button asChild size="sm" className="gradient-bg text-white">
                <Link to="/settings">Edit profile</Link>
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-semibold tracking-tight">{user?.name}</h1>
            <div className="text-sm text-muted-foreground">@{user?.username}</div>
            {user?.bio && <p className="mt-3 max-w-2xl text-sm">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {user?.college && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {user.college}
                </span>
              )}
              {joined && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Joined {joined}
                </span>
              )}
              {user?.portfolio && (
                <a
                  href={user.portfolio}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <LinkIcon className="h-3.5 w-3.5" /> {user.portfolio}
                </a>
              )}
              {user?.github && (
                <a
                  href={user.github.startsWith("http") ? user.github : `https://github.com/${user.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Github className="h-3.5 w-3.5" /> GitHub
                </a>
              )}
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {[
              { label: "Projects", value: projects.length },
              { label: "Stars", value: projects.reduce((n, p) => n + p.stars, 0) },
              { label: "Views", value: projects.reduce((n, p) => n + p.views, 0) },
              { label: "Contribution", value: contribution },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-1 text-lg font-semibold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
            </TabsList>
            <TabsContent value="projects" className="mt-5">
              {projectsQ.isLoading ? (
                <div className="grid place-items-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : projects.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {projects.map((p, i) => (
                    <ProjectCard key={p.id} project={p} index={i} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  You haven't uploaded any projects yet.{" "}
                  <Link to="/upload" className="font-medium text-primary hover:opacity-80">
                    Upload your first project →
                  </Link>
                </div>
              )}
            </TabsContent>
            <TabsContent value="badges" className="mt-5">
              {user?.badges?.length ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {user.badges.map((b) => (
                    <div
                      key={b}
                      className="card-lift rounded-2xl border border-border/60 bg-card p-4 text-center shadow-card"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-bg text-white">
                        <Award className="h-6 w-6" />
                      </div>
                      <div className="mt-3 text-sm font-semibold">{b}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  No badges yet. Publish projects to earn them.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          {user?.skills?.length ? (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <h3 className="text-sm font-semibold">Skills</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {user.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-secondary px-2 py-1 text-xs font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Contribution score</h3>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-3xl font-semibold">{contribution}</div>
            </div>
            <Progress value={Math.min(contribution, 100)} className="mt-3 h-2" />
          </div>
        </aside>
      </div>
    </div>
  );
}