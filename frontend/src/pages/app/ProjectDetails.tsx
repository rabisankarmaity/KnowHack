import { Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark as BookmarkIcon,
  Star,
  Github,
  FileText,
  Presentation,
  ChevronLeft,
  Share2,
  Eye,
  ArrowRight,
  ExternalLink,
  Loader2,
  Download,
  File as FileIcon,
  Users,
  Lightbulb,
  Layers,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Flag,
  FolderTree,
  GitBranch,
  Globe,
  Link2,
  MessageSquare,
  Monitor,
  Puzzle,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Video,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { projectsApi } from "@/lib/api/projects";
import { bookmarksApi } from "@/lib/api/bookmarks";
import { aiApi } from "@/lib/api/ai";
import { AiSummaryCard } from "@/components/ai/AiSummaryCard";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SimilarProjects } from "@/components/ai/SimilarProjects";
import { ProjectMentorChat } from "@/components/ai/ProjectMentorChat";
import { WeaknessPanel } from "@/components/ai/WeaknessPanel";
import { fallbackCover, initials } from "@/lib/project-vm";
import type { FileRef, ProjectDTO, UserDTO } from "@/lib/api/types";
import { apiErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function ProjectDetails() {
  const { id: slug } = useParams({ from: "/_app/projects/$id" });
  const qc = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", "detail", slug],
    queryFn: () => projectsApi.getBySlug(slug),
    retry: 0,
  });

  const bookmarksQ = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => bookmarksApi.list(),
    enabled: isAuthenticated,
  });

  const project = data?.data.project;
  const projectId = project?._id;

  const aiQ = useQuery({
    queryKey: ["ai", "status", projectId],
    queryFn: () => aiApi.status(projectId!),
    enabled: Boolean(projectId),
    retry: 1,
    // Poll while the AI service is still processing the upload.
    refetchInterval: (q) =>
      q.state.data?.data.ai?.status === "processing" ? 4000 : false,
  });

  const similarQ = useQuery({
    queryKey: ["ai", "similar", projectId],
    queryFn: () => aiApi.similar(projectId!, 5),
    enabled: Boolean(projectId),
    retry: 1,
  });

  const analyzeMut = useMutation({
    mutationFn: () => aiApi.analyze(projectId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai", "status", projectId] });
      qc.invalidateQueries({ queryKey: ["ai", "similar", projectId] });
      toast.success("AI analysis complete");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "AI analysis failed")),
  });

  const existingBookmark = project
    ? bookmarksQ.data?.data.items.find((b) => {
        const pid = typeof b.projectId === "object" ? b.projectId._id : b.projectId;
        return pid === project._id;
      })
    : undefined;

  const bookmarkMut = useMutation({
    mutationFn: async () => {
      if (!project) return;
      if (existingBookmark) {
        await bookmarksApi.remove(existingBookmark._id);
      } else {
        await bookmarksApi.create(project._id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      qc.invalidateQueries({ queryKey: ["projects", "detail", slug] });
      toast.success(existingBookmark ? "Bookmark removed" : "Bookmarked");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Bookmark failed")),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !project) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The project you're looking for doesn't exist or is no longer public.
        </p>
        <Button asChild className="mt-6">
          <Link to="/discover">Back to Discover</Link>
        </Button>
      </div>
    );
  }

  const owner = (typeof project.owner === "object" ? project.owner : undefined) as
    | UserDTO
    | undefined;
  const authorName = owner?.name || "Unknown";
  const authorAvatar = (owner?.avatar || initials(authorName)).slice(0, 2).toUpperCase();
  const cover = project.coverImage || project.thumbnail;
  const techGroups: { label: string; items: string[] }[] = (
    [
      ["Languages", project.techStack?.languages],
      ["Frameworks", project.techStack?.frameworks],
      ["Libraries", project.techStack?.libraries],
      ["Databases", project.techStack?.database],
      ["Cloud", project.techStack?.cloud],
      ["APIs", project.techStack?.apis],
      ["Tools", project.techStack?.tools],
    ] as [string, string[] | undefined][]
  )
    .filter(([, items]) => (items?.length ?? 0) > 0)
    .map(([label, items]) => ({ label: label!, items: items! }));
  const docFiles = [
    ...(project.resources?.additionalFiles ?? []),
    ...(project.resources?.researchPapers ?? []),
  ];
  const hasResearchText = Boolean(
    project.research?.summary ||
      project.research?.survey ||
      project.research?.competitorAnalysis ||
      project.research?.marketResearch
  );
  const isOwner = Boolean(
    isAuthenticated &&
      user &&
      (project.owner as unknown) &&
      ((project.owner as UserDTO)._id === user._id || (project.owner as string) === user._id)
  );
  const journeyFiles: FileRef[] = [];
  const researchFiles: FileRef[] = [];
  const otherFiles: FileRef[] = [];
  for (const pf of project.files ?? []) {
    if (pf.category === "research" || pf.category === "presentation") researchFiles.push(pf.file);
    else if (pf.category === "architecture" || pf.category === "database" || pf.category === "ui")
      journeyFiles.push(pf.file);
    else otherFiles.push(pf.file);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        to="/discover"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to discover
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card"
      >
        <div
          className="relative aspect-[21/9] w-full"
          style={cover ? undefined : { background: fallbackCover(project.slug) }}
        >
          {cover && (
            <img src={cover} alt={project.title} className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2 text-white/90">
              {project.category && (
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
                  {project.category}
                </span>
              )}
              {project.hackathonName && (
                <span className="text-xs opacity-80">
                  {project.hackathonName}
                  {project.year ? ` · ${project.year}` : ""}
                </span>
              )}
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              {project.title}
            </h1>
            {project.shortDescription && (
              <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
                {project.shortDescription}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full gradient-bg text-sm font-semibold text-white">
              {authorAvatar}
            </div>
            <div>
              <div className="text-sm font-medium">{authorName}</div>
              <div className="text-xs text-muted-foreground">{owner?.college || ""}</div>
            </div>
            <div className="ml-3 flex items-center gap-3 border-l border-border/60 pl-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {(project.likes ?? 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {(project.views ?? 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <BookmarkIcon className="h-3.5 w-3.5" />
                {project.bookmarks ?? 0}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button asChild variant="outline" size="sm">
                <Link to="/upload" search={{ edit: project.slug } as never}>
                  Edit
                </Link>
              </Button>
            )}
            {project.implementation?.githubRepository && (
              <Button asChild variant="outline" size="sm">
                <a href={project.implementation.githubRepository} target="_blank" rel="noreferrer">
                  <Github className="h-4 w-4" /> GitHub
                </a>
              </Button>
            )}
            {project.resources?.ppt?.url && (
              <Button asChild variant="outline" size="sm">
                <a href={project.resources.ppt.url} target="_blank" rel="noreferrer">
                  <Presentation className="h-4 w-4" /> PPT
                </a>
              </Button>
            )}
            {project.resources?.documentation?.url && (
              <Button asChild variant="outline" size="sm">
                <a href={project.resources.documentation.url} target="_blank" rel="noreferrer">
                  <FileText className="h-4 w-4" /> PDF
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied");
                }
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {isAuthenticated && (
              <Button
                size="sm"
                onClick={() => bookmarkMut.mutate()}
                disabled={bookmarkMut.isPending}
                className="gradient-bg text-white"
              >
                <BookmarkIcon className="h-4 w-4" />{" "}
                {existingBookmark ? "Bookmarked" : "Bookmark"}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <AiSummaryCard
            ai={aiQ.data?.data.ai}
            loading={aiQ.isLoading}
            offline={Boolean(aiQ.error)}
            canRetry={isAuthenticated}
            onRetry={() =>
              isAuthenticated ? analyzeMut.mutate() : aiQ.refetch()
            }
            retrying={analyzeMut.isPending}
          />
          <AiInsightsPanel ai={aiQ.data?.data.ai} loading={aiQ.isLoading} />
          <WeaknessPanel projectId={project._id} />

          {project.aiReview && (
            <Section title="Case file readiness">
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-full ${
                      project.aiReview.status === "ok"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : project.aiReview.status === "attention"
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {project.aiReview.status === "ok" ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : project.aiReview.status === "attention" ? (
                      <Flag className="h-6 w-6" />
                    ) : (
                      <Zap className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold capitalize">
                      {project.aiReview.status} · {project.aiReview.completeness}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.aiReview.completeSections} of {project.aiReview.totalSections} sections covered
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full gradient-bg transition-all"
                      style={{ width: `${project.aiReview.completeness}%` }}
                    />
                  </div>
                  {(project.aiReview.suggestions?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {project.aiReview.suggestions![0]}
                    </p>
                  )}
                </div>
              </div>
            </Section>
          )}

          {(project.team?.length ?? 0) > 0 && (
            <Section title="Team">
              <div className="grid gap-3 sm:grid-cols-2">
                {project.team!.map((m, i) => (
                  <div
                    key={m._id || i}
                    className="flex gap-3 rounded-xl border border-border/60 bg-card p-4"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-bg text-xs font-semibold text-white">
                      {initials(m.name || "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{m.name}</div>
                      {(m.role || m.department) && (
                        <div className="text-xs text-muted-foreground">
                          {[m.role, m.department].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {m.university && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{m.university}</div>
                      )}
                      {(m.github || m.linkedin || m.portfolio) && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-primary">
                          {m.github && (
                            <a href={m.github} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                              <Github className="h-3 w-3" /> GitHub
                            </a>
                          )}
                          {m.linkedin && (
                            <a href={m.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> LinkedIn
                            </a>
                          )}
                          {m.portfolio && (
                            <a href={m.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                              <Link2 className="h-3 w-3" /> Portfolio
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {typeof m.contribution === "number" && m.contribution > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-semibold">{m.contribution}%</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">role</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {project.solution?.overview && (
            <Section title="Solution overview">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {project.solution.overview}
              </p>
              {project.solution.usp && (
                <div className="mt-4 rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Star className="h-3.5 w-3.5" /> Unique selling point
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{project.solution.usp}</p>
                </div>
              )}
              {(project.solution.innovation || project.solution.workflow) && (
                <div className="mt-5">
                  {project.solution.innovation && (
                    <div className="flex gap-3 rounded-xl border-l-4 border-primary bg-primary/5 p-4">
                      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <p className="text-sm leading-relaxed">{project.solution.innovation}</p>
                    </div>
                  )}
                  {project.solution.workflow && (
                    <div className="mt-3 flex gap-3 rounded-xl border-l-4 border-secondary bg-secondary/5 p-4">
                      <Layers className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Workflow
                        </div>
                        <p className="mt-1 text-sm leading-relaxed">
                          {project.solution.workflow}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          {project.problem?.overview && (
            <Section title="Problem statement">
              <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
                <p className="text-sm leading-relaxed">{project.problem.overview}</p>
              </div>
              {project.problem.targetUsers && (
                <div className="mt-3 flex gap-3 rounded-xl border border-border/60 bg-card p-4">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Target users
                    </div>
                    <p className="mt-1 text-sm leading-relaxed">{project.problem.targetUsers}</p>
                  </div>
                </div>
              )}
              {((project.problem.existingSolutions?.length ?? 0) > 0 ||
                (project.problem.limitations?.length ?? 0) > 0) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(project.problem.existingSolutions?.length ?? 0) > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Existing solutions
                      </div>
                      <ul className="space-y-2">
                        {project.problem.existingSolutions!.map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                          >
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-secondary" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(project.problem.limitations?.length ?? 0) > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Limitations
                      </div>
                      <ul className="space-y-2">
                        {project.problem.limitations!.map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                          >
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {(project.problem.painPoints?.length ?? 0) > 0 && (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {project.problem.painPoints!.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                    >
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {(project.existingSolutions?.length ?? 0) > 0 && (
            <Section title="Existing solutions">
              <div className="grid gap-4">
                {project.existingSolutions!.map((es) => (
                  <div key={es._id || es.name} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{es.name}</span>
                        </div>
                        {es.website && (
                          <a
                            href={es.website}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> {es.website}
                          </a>
                        )}
                      </div>
                    </div>
                    {es.description && <p className="mt-2 text-sm text-muted-foreground">{es.description}</p>}
                    {(es.strengths || es.limitations || es.difference) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {es.strengths && (
                          <div className="flex items-start gap-2 text-xs">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            <span className="text-muted-foreground">{es.strengths}</span>
                          </div>
                        )}
                        {es.limitations && (
                          <div className="flex items-start gap-2 text-xs">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                            <span className="text-muted-foreground">{es.limitations}</span>
                          </div>
                        )}
                        {es.difference && (
                          <div className="flex items-start gap-2 text-xs">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span className="text-muted-foreground">{es.difference}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {es.whyNeeded && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Why this space needs you: </span>
                        {es.whyNeeded}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(project.features?.length ?? 0) > 0 && (
            <Section title="Feature breakdown">
              <div className="space-y-3">
                {project.features!.map((f) => (
                  <div key={f._id || f.name} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{f.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {f.priority && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              f.priority === "must-have"
                                ? "bg-destructive/10 text-destructive"
                                : f.priority === "should-have"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {f.priority.replace("-", " ")}
                          </span>
                        )}
                        {f.status && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              f.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : f.status === "in-development"
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {f.status.replace("-", " ")}
                          </span>
                        )}
                      </div>
                    </div>
                    {f.description && <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>}
                    {(f.problemSolved || f.futureImprovement) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {f.problemSolved && (
                          <div className="flex items-start gap-2 text-xs">
                            <Puzzle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                            <div>
                              <span className="font-medium text-foreground">Problem solved: </span>
                              <span className="text-muted-foreground">{f.problemSolved}</span>
                            </div>
                          </div>
                        )}
                        {f.futureImprovement && (
                          <div className="flex items-start gap-2 text-xs">
                            <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <div>
                              <span className="font-medium text-foreground">Future improvement: </span>
                              <span className="text-muted-foreground">{f.futureImprovement}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
            {(techGroups.length > 0 ||
            project.techStack?.infrastructure ||
            project.techStack?.developmentDuration) && (
            <Section title="Tech stack">
              <div className="space-y-4">
                {techGroups.map((g) => (
                  <div key={g.label}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((t) => (
                        <span
                          key={t}
                          className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {project.techStack?.infrastructure && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Infrastructure
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["Hosting", project.techStack.infrastructure.hosting],
                        ["Storage", project.techStack.infrastructure.storage],
                        ["CDN", project.techStack.infrastructure.cdn],
                        ["CI/CD", project.techStack.infrastructure.ciCd],
                        ["Monitoring", project.techStack.infrastructure.monitoring],
                      ]
                        .filter(([, v]) => Boolean(v))
                        .map(([label, v]) => (
                          <span
                            key={label}
                            className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
                          >
                            <span className="text-muted-foreground">{label}: </span>
                            {v}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                {project.techStack?.developmentDuration && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Development duration:{" "}
                    {project.techStack.developmentDuration}
                  </p>
                )}
              </div>
            </Section>
          )}

          {(project.solution?.architectureSummary || project.architecture?.description) && (
            <Section title="Architecture">
              {project.solution?.architectureSummary && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {project.solution.architectureSummary}
                </p>
              )}
              {project.architecture?.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {project.architecture.description}
                </p>
              )}
              {project.architecture?.diagram?.url && (
                <a
                  href={project.architecture.diagram.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm hover:border-primary/40"
                >
                  <FolderTree className="h-4 w-4" />
                  {project.architecture.diagram.name || "Architecture diagram"}
                </a>
              )}
              {project.architecture?.dataFlow && (
                <div className="mt-4 rounded-xl border-l-4 border-primary bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Zap className="h-3.5 w-3.5" /> Data flow
                  </div>
                  {project.architecture.dataFlow.description && (
                    <p className="mt-2 text-sm leading-relaxed">
                      {project.architecture.dataFlow.description}
                    </p>
                  )}
                  {project.architecture.dataFlow.diagram?.url && (
                    <a
                      href={project.architecture.dataFlow.diagram.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs hover:border-primary/40"
                    >
                      <FolderTree className="h-4 w-4" />
                      {project.architecture.dataFlow.diagram.name || "Data flow diagram"}
                    </a>
                  )}
                </div>
              )}
            </Section>
          )}

          {project.architecture?.database && (
            <Section title="Database">
              <div className="rounded-xl border border-border/60 bg-card p-4">
                {(project.architecture.database.type || project.architecture.database.description) && (
                  <div className="flex items-start gap-3">
                    <Database className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      {project.architecture.database.type && (
                        <div className="text-sm font-semibold">{project.architecture.database.type}</div>
                      )}
                      {project.architecture.database.description && (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {project.architecture.database.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {(project.architecture.database.collections?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Collections
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.architecture.database.collections!.map((c) => (
                        <span
                          key={c}
                          className="rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(project.architecture.database.relationships?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {project.architecture.database.relationships!.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
                {(project.architecture.database.indexes?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Indexes
                    </div>
                    <ul className="space-y-1.5">
                      {project.architecture.database.indexes!.map((ix) => (
                        <li key={ix} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Server className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {ix}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {project.architecture.database.scalabilityNotes && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Scalability: </span>
                    {project.architecture.database.scalabilityNotes}
                  </p>
                )}
                {project.architecture.database.erDiagram?.url && (
                  <a
                    href={project.architecture.database.erDiagram.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs hover:border-primary/40"
                  >
                    <FolderTree className="h-4 w-4" />
                    {project.architecture.database.erDiagram.name || "ER diagram"}
                  </a>
                )}
              </div>
            </Section>
          )}

          {(project.architecture?.apiIntegrations?.length ?? 0) > 0 && (
            <Section title="API integrations">
              <div className="grid gap-3 sm:grid-cols-2">
                {project.architecture!.apiIntegrations!.map((a) => (
                  <div key={a._id || a.name} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{a.name || a.provider || "API"}</span>
                    </div>
                    {(a.provider || a.authType) && (
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {a.provider && <span>{a.provider}</span>}
                        {a.authType && <span>· {a.authType}</span>}
                      </div>
                    )}
                    {a.purpose && <p className="mt-2 text-xs text-muted-foreground">{a.purpose}</p>}
                    {a.documentationUrl && (
                      <a
                        href={a.documentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Docs
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {project.architecture?.uiUx && (
            <Section title="UI/UX">
              <div className="rounded-xl border border-border/60 bg-card p-4">
                {project.architecture.uiUx.figmaUrl && (
                  <a
                    href={project.architecture.uiUx.figmaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15"
                  >
                    <Monitor className="h-4 w-4" /> Open Figma
                  </a>
                )}
                {(project.architecture.uiUx.designSystem || project.architecture.uiUx.userFlow) && (
                  <div className="mt-3 space-y-3">
                    {project.architecture.uiUx.designSystem && (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Design system
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {project.architecture.uiUx.designSystem}
                        </p>
                      </div>
                    )}
                    {project.architecture.uiUx.userFlow && (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          User flow
                        </div>
                        <p className="text-xs text-muted-foreground">{project.architecture.uiUx.userFlow}</p>
                      </div>
                    )}
                  </div>
                )}
                {project.architecture.uiUx.accessibilityNotes && (
                  <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {project.architecture.uiUx.accessibilityNotes}
                  </p>
                )}
                {(project.architecture.uiUx.screenshots?.length ?? 0) > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {project.architecture.uiUx.screenshots!.map((s, i) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-lg border border-border/60"
                      >
                        <img
                          src={s.url}
                          alt={s.name || `UI screenshot ${i + 1}`}
                          className="h-36 w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {((project.implementation?.modules?.length ?? 0) > 0 ||
            project.implementation?.folderStructure) && (
            <Section title="Implementation">
              {(project.implementation?.modules?.length ?? 0) > 0 && (
                <>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Modules
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.implementation!.modules!.map((m) => (
                      <span
                        key={m}
                        className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {project.implementation?.folderStructure && (
                <pre className="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-4 text-xs leading-relaxed">
                  {project.implementation.folderStructure}
                </pre>
              )}
            </Section>
          )}

          {(project.developmentJourney?.length ?? 0) > 0 && (
            <Section title="Development journey">
              <ol className="relative space-y-6 border-l border-border/60 pl-6">
                {project.developmentJourney!.map((j, i) => (
                  <li key={j._id || i} className="relative">
                    <div className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full gradient-bg text-[10px] font-semibold text-white">
                      {i + 1}
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold">
                          {[j.phase, j.title].filter(Boolean).join(" · ") || `Phase ${i + 1}`}
                        </div>
                        {j.period && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {j.period}
                          </div>
                        )}
                      </div>
                      {j.description && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{j.description}</p>
                      )}
                      {(j.problemsEncountered || j.solutionImplemented) && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {j.problemsEncountered && (
                            <div className="flex items-start gap-2 text-xs">
                              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                              <div>
                                <span className="font-medium text-foreground">Problems: </span>
                                <span className="text-muted-foreground">{j.problemsEncountered}</span>
                              </div>
                            </div>
                          )}
                          {j.solutionImplemented && (
                            <div className="flex items-start gap-2 text-xs">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              <div>
                                <span className="font-medium text-foreground">Solution: </span>
                                <span className="text-muted-foreground">{j.solutionImplemented}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {(j.files?.length ?? 0) > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {j.files!.map((f) => (
                            <a
                              key={f.url}
                              href={f.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2 py-1 text-xs hover:border-primary/40"
                            >
                              <FileIcon className="h-3 w-3" /> {f.name || f.url.split("/").pop()}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {(project.judgeFeedback?.length ?? 0) > 0 && (
            <Section title="Judge feedback">
              <div className="space-y-4">
                {project.judgeFeedback!.map((fb, i) => (
                  <div key={fb._id || i} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{fb.judgeName || "Judge"} feedback</span>
                      </div>
                      {fb.score && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {fb.score}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {fb.strengths && (
                        <div className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <div>
                            <span className="font-medium text-foreground">Strengths: </span>
                            <span className="text-muted-foreground">{fb.strengths}</span>
                          </div>
                        </div>
                      )}
                      {fb.weaknesses && (
                        <div className="flex items-start gap-2 text-xs">
                          <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                          <div>
                            <span className="font-medium text-foreground">Weaknesses: </span>
                            <span className="text-muted-foreground">{fb.weaknesses}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {(fb.question || fb.answer || fb.comment) && (
                      <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs">
                        {fb.question && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Q: </span>{fb.question}
                          </p>
                        )}
                        {fb.answer && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">A: </span>{fb.answer}
                          </p>
                        )}
                        {fb.comment && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Comment: </span>{fb.comment}
                          </p>
                        )}
                      </div>
                    )}
                    {fb.suggestions && (
                      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                        <span>{fb.suggestions}</span>
                      </p>
                    )}
                    {fb.overallFeedback && (
                      <p className="mt-3 rounded-lg bg-primary/5 p-3 text-xs leading-relaxed">
                        {fb.overallFeedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(docFiles.length > 0 ||
            journeyFiles.length > 0 ||
            researchFiles.length > 0 ||
            otherFiles.length > 0 ||
            project.resources?.demoVideo?.url ||
            project.presentation?.pitchDeck?.url ||
            project.implementation?.architectureDiagram?.url ||
            project.implementation?.flowDiagram?.url) && (
            <Section title="Files & downloads">
              <div className="grid gap-3 sm:grid-cols-2">
                {project.implementation?.architectureDiagram?.url && (
                  <FileLink
                    href={project.implementation.architectureDiagram.url}
                    label={project.implementation.architectureDiagram.name || "Architecture diagram"}
                  />
                )}
                {project.implementation?.flowDiagram?.url && (
                  <FileLink
                    href={project.implementation.flowDiagram.url}
                    label={project.implementation.flowDiagram.name || "Flow diagram"}
                  />
                )}
                {project.resources?.demoVideo?.url && (
                  <FileLink
                    href={project.resources.demoVideo.url}
                    label={project.resources.demoVideo.name || "Demo video"}
                  />
                )}
                {project.presentation?.pitchDeck?.url && (
                  <FileLink
                    href={project.presentation.pitchDeck.url}
                    label={project.presentation.pitchDeck.name || "Pitch deck"}
                  />
                )}
                {docFiles.map((f) => (
                  <FileLink
                    key={f.url}
                    href={f.url}
                    label={f.name || f.url.split("/").pop() || "File"}
                  />
                ))}
                {journeyFiles.map((f) => (
                  <FileLink
                    key={f.url}
                    href={f.url}
                    label={f.name || f.url.split("/").pop() || "Diagram"}
                  />
                ))}
                {researchFiles.map((f) => (
                  <FileLink
                    key={f.url}
                    href={f.url}
                    label={f.name || f.url.split("/").pop() || "Research file"}
                  />
                ))}
                {otherFiles.map((f) => (
                  <FileLink
                    key={f.url}
                    href={f.url}
                    label={f.name || f.url.split("/").pop() || "File"}
                  />
                ))}
              </div>
            </Section>
          )}

          {project.presentation && (
            <Section title="Presentation & demo">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {project.presentation.liveDemoUrl && (
                    <a
                      href={project.presentation.liveDemoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-sm font-medium hover:border-primary/40"
                    >
                      <Globe className="h-4 w-4 text-primary" /> Live demo
                      <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                  {project.presentation.demoVideoUrl && (
                    <a
                      href={project.presentation.demoVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-sm font-medium hover:border-primary/40"
                    >
                      <Video className="h-4 w-4 text-primary" /> Demo video
                      <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
                {(project.presentation.demoInstructions ||
                  project.presentation.demoCredentials ||
                  project.presentation.demoNotes) && (
                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    {project.presentation.demoInstructions && (
                      <div className="mb-3">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          How to demo
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {project.presentation.demoInstructions}
                        </p>
                      </div>
                    )}
                    {project.presentation.demoCredentials && (
                      <div className="mb-3">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Demo credentials
                        </div>
                        <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs">
                          {project.presentation.demoCredentials}
                        </pre>
                      </div>
                    )}
                    {project.presentation.demoNotes && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {project.presentation.demoNotes}
                      </p>
                    )}
                  </div>
                )}
                {(project.presentation.notes || project.presentation.businessModel) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {project.presentation.businessModel && (
                      <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                          Business model
                        </div>
                        <p className="mt-2 text-sm leading-relaxed">
                          {project.presentation.businessModel}
                        </p>
                      </div>
                    )}
                    {project.presentation.notes && (
                      <div className="rounded-xl border border-border/60 bg-card p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Presentation notes
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {project.presentation.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {(hasResearchText ||
            (project.research?.methods?.length ?? 0) > 0 ||
            (project.research?.insights?.length ?? 0) > 0 ||
            (project.research?.academicReferences?.length ?? 0) > 0 ||
            (project.research?.researchLinks?.length ?? 0) > 0 ||
            (project.research?.references?.length ?? 0) > 0 ||
            project.research?.researchPdf?.url) && (
            <Section title="Research">
              {(project.research?.methods?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" /> Research methods
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.research!.methods!.map((m) => (
                      <span
                        key={m}
                        className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  {project.research?.intervieweeCount ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <Users className="mr-1 inline h-3.5 w-3.5" />
                      {project.research.intervieweeCount} people consulted
                    </p>
                  ) : null}
                </div>
              )}
              <Accordion type="single" collapsible className="rounded-2xl border border-border/60 bg-card">
                {project.research?.summary && (
                  <AccordionItem value="summary" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Summary</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.summary}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.findings && (
                  <AccordionItem value="findings" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Findings</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.findings}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.validation && (
                  <AccordionItem value="validation" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Validation</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.validation}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.surveyResults && (
                  <AccordionItem value="survey-results" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Survey results</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.surveyResults}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.marketObservations && (
                  <AccordionItem value="market-observations" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Market observations</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.marketObservations}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.statistics && (
                  <AccordionItem value="statistics" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Statistics</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.statistics}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {(project.research?.insights?.length ?? 0) > 0 && (
                  <AccordionItem value="insights" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Key insights</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {project.research!.insights!.map((i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {i}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.survey && (
                  <AccordionItem value="survey" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Survey</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.survey}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.competitorAnalysis && (
                  <AccordionItem value="competitors" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">
                      Competitor analysis
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.competitorAnalysis}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.marketResearch && (
                  <AccordionItem value="market" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">
                      Market research
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {project.research.marketResearch}
                    </AccordionContent>
                  </AccordionItem>
                )}
                {(project.research?.academicReferences?.length ?? 0) > 0 && (
                  <AccordionItem value="academic-references" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Academic references</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {project.research!.academicReferences!.map((ref) => (
                          <li key={ref} className="text-sm text-muted-foreground">{ref}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.researchLinks?.length ? (
                  <AccordionItem value="research-links" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Research links</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {project.research!.researchLinks!.map((ref) => (
                          <li key={ref} className="text-sm text-muted-foreground">
                            <a
                              href={/^https?:\/\//i.test(ref) ? ref : undefined}
                              target="_blank"
                              rel="noreferrer"
                              className={/^https?:\/\//i.test(ref) ? "flex items-center gap-1.5 text-primary hover:underline" : "block"}
                            >
                              {/^https?:\/\//i.test(ref) && (
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              )}
                              {ref}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
                {(project.research?.references?.length ?? 0) > 0 && (
                  <AccordionItem value="references" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">References</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {project.research!.references!.map((ref) => (
                          <li key={ref} className="text-sm text-muted-foreground">
                            <a
                              href={/^https?:\/\//i.test(ref) ? ref : undefined}
                              target="_blank"
                              rel="noreferrer"
                              className={/^https?:\/\//i.test(ref) ? "flex items-center gap-1.5 text-primary hover:underline" : "block"}
                            >
                              {/^https?:\/\//i.test(ref) && (
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              )}
                              {ref}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {project.research?.researchPdf?.url && (
                  <AccordionItem value="research-pdf" className="px-4">
                    <AccordionTrigger className="text-sm font-medium">Research paper</AccordionTrigger>
                    <AccordionContent>
                      <a
                        href={project.research.researchPdf.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm hover:border-primary/40"
                      >
                        <FileText className="h-4 w-4" />
                        {project.research.researchPdf.name || "Open research paper"} ({project.research.researchPdf.size ? `${Math.round(project.research.researchPdf.size / 1024)} KB` : ""})
                      </a>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </Section>
          )}

          {(project.lessonsLearned &&
            (project.lessonsLearned.challenges?.length ||
              project.lessonsLearned.mistakes?.length ||
              project.lessonsLearned.solutions?.length ||
              project.lessonsLearned.wentWell?.length ||
              project.lessonsLearned.failed?.length ||
              project.lessonsLearned.doDifferently?.length ||
              project.lessonsLearned.featuresRemoved?.length ||
              project.lessonsLearned.technicalLessons?.length ||
              project.lessonsLearned.productLessons?.length ||
              project.lessonsLearned.teamLessons?.length ||
              project.lessonsLearned.businessLessons?.length ||
              project.lessonsLearned.beginnerAdvice ||
              project.lessonsLearned.biggestMistake ||
              project.lessonsLearned.biggestAchievement)) && (
            <Section title="Lessons learned">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Challenges
              </div>
              <ol className="space-y-3">
                {project.lessonsLearned!.challenges!.map((l, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-xl border border-border/60 bg-card p-4"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full gradient-bg text-xs font-semibold text-white">
                      {i + 1}
                    </div>
                    <p className="text-sm">{l}</p>
                  </li>
                ))}
              </ol>
              {(project.lessonsLearned?.mistakes?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mistakes to avoid
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {project.lessonsLearned!.mistakes!.map((m) => (
                      <li
                        key={m}
                        className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(project.lessonsLearned?.solutions?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Solutions
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {project.lessonsLearned!.solutions!.map((s) => (
                      <li
                        key={s}
                        className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {project.lessonsLearned?.beginnerAdvice && (
                <div className="mt-4 flex gap-3 rounded-xl border-l-4 border-secondary bg-secondary/5 p-4">
                  <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">Advice for beginners: </span>
                    {project.lessonsLearned.beginnerAdvice}
                  </p>
                </div>
              )}
              {(project.lessonsLearned?.wentWell?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                    What went well
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {project.lessonsLearned!.wentWell!.map((w) => (
                      <li
                        key={w}
                        className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(project.lessonsLearned?.failed?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-destructive">
                    What didn't go well
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {project.lessonsLearned!.failed!.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                      >
                        <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(project.lessonsLearned?.doDifferently?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    What we'd do differently
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {project.lessonsLearned!.doDifferently!.map((d) => (
                      <li
                        key={d}
                        className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                      >
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(project.lessonsLearned?.featuresRemoved?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Features we cut
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.lessonsLearned!.featuresRemoved!.map((f) => (
                      <span
                        key={f}
                        className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(project.lessonsLearned?.biggestMistake ||
                project.lessonsLearned?.biggestAchievement) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {project.lessonsLearned.biggestAchievement && (
                    <div className="flex gap-3 rounded-xl border-l-4 border-emerald-500 bg-emerald-500/5 p-4">
                      <Award className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                          Biggest achievement
                        </div>
                        <p className="mt-1 text-sm leading-relaxed">
                          {project.lessonsLearned.biggestAchievement}
                        </p>
                      </div>
                    </div>
                  )}
                  {project.lessonsLearned.biggestMistake && (
                    <div className="flex gap-3 rounded-xl border-l-4 border-destructive bg-destructive/5 p-4">
                      <Flag className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-destructive">
                          Biggest mistake
                        </div>
                        <p className="mt-1 text-sm leading-relaxed">
                          {project.lessonsLearned.biggestMistake}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(project.lessonsLearned?.technicalLessons?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Technical lessons
                  </div>
                  <ul className="space-y-2">
                    {project.lessonsLearned!.technicalLessons!.map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(project.lessonsLearned?.productLessons?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Product lessons
                  </div>
                  <ul className="space-y-2">
                    {project.lessonsLearned!.productLessons!.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(project.lessonsLearned?.teamLessons?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team lessons
                  </div>
                  <ul className="space-y-2">
                    {project.lessonsLearned!.teamLessons!.map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(project.lessonsLearned?.businessLessons?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Business lessons
                  </div>
                  <ul className="space-y-2">
                    {project.lessonsLearned!.businessLessons!.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {(project.futureScope?.length ?? 0) > 0 && (
            <Section title="Future scope">
              <div className="space-y-3">
                {project.futureScope!.map((f) => (
                  <div key={f._id || f.title} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{f.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {f.priority && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              f.priority === "high"
                                ? "bg-destructive/10 text-destructive"
                                : f.priority === "medium"
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {f.priority} priority
                          </span>
                        )}
                        {f.timeline && (
                          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <Clock className="h-3 w-3" /> {f.timeline}
                          </span>
                        )}
                      </div>
                    </div>
                    {f.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(project.lessonsLearned?.futureImprovements?.length ?? 0) > 0 && (
            <Section title="Future improvements">
              <ul className="grid gap-2 sm:grid-cols-2">
                {project.lessonsLearned!.futureImprovements!.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm"
                  >
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SimilarProjects
            items={similarQ.data?.data.items}
            loading={similarQ.isLoading}
            offline={Boolean(similarQ.error)}
            stale={similarQ.data?.data.stale}
            onRetry={() => similarQ.refetch()}
          />
          <ProjectMentorChat projectId={project._id} projectTitle={project.title} />
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold">Project details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {project.hackathonName && <Row label="Hackathon" value={project.hackathonName} />}
              {project.organizer && <Row label="Organized by" value={project.organizer} />}
              {project.year && <Row label="Year" value={String(project.year)} />}
              {project.category && <Row label="Category" value={project.category} />}
              {project.domain && <Row label="Domain" value={project.domain} />}
              {project.sdgAlignment && <Row label="SDG" value={project.sdgAlignment} />}
              {project.difficulty && <Row label="Difficulty" value={project.difficulty} />}
              {project.teamName && <Row label="Team" value={project.teamName} />}
              {project.teamSize ? <Row label="Team size" value={String(project.teamSize)} /> : null}
              {owner?.college && <Row label="University" value={owner.college} />}
              {project.projectStatus && <Row label="Status" value={project.projectStatus.replace("-", " ")} />}
              {project.visibility && project.visibility !== "public" && (
                <Row label="Visibility" value={project.visibility} />
              )}
              {project.license && <Row label="License" value={project.license} />}
            </dl>
          </div>
          {project.resources?.driveLinks?.length ? (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <h3 className="text-sm font-semibold">Resources</h3>
              <div className="mt-3 space-y-2">
                {project.resources.driveLinks.map((l) => (
                  <a
                    key={l}
                    href={l}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-xs hover:border-primary/40"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="truncate">{l}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
    >
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </motion.section>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  );
}
function FileLink({ href, label }: { href: string; label: string }) {
  const isImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {isImage ? <Download className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label.split("/").pop()}</div>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

// Silence unused-var warning for optional dependency
export type _P = ProjectDTO;