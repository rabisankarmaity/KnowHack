import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Archive,
  Layers,
  Search as SearchIcon,
  GitBranch,
  Users,
  Award,
  Sparkles,
  Star,
  Quote,
  Check,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/common/ProjectCard";
import { projects, features, howItWorks, testimonials, stats } from "@/lib/mock-data";
import { fallbackCover, type ProjectVM } from "@/lib/project-vm";

// Convert marketing seed projects to view-model shape for ProjectCard.
const previewProjects: ProjectVM[] = projects.map((p) => ({
  id: p.id,
  slug: p.id,
  title: p.title,
  tagline: p.tagline,
  cover: p.cover || fallbackCover(p.id),
  coverIsImage: false,
  category: p.category,
  hackathon: p.hackathon,
  year: p.year,
  difficulty: p.difficulty,
  tech: p.tech,
  author: p.author,
  stars: p.stars,
  views: p.views,
  bookmarks: p.bookmarks,
}));

const iconMap: Record<string, any> = { Archive, Layers, Search: SearchIcon, GitBranch, Users, Award };

export function Landing() {
  const featured = previewProjects.filter((_, i) => projects[i].featured);
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklab,var(--primary)_25%,transparent),transparent_60%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Navbar />

        {/* Hero */}
        <section className="pt-16 sm:pt-24 md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Now indexing 12,000+ hackathon projects
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Build Once.{" "}
              <span className="gradient-text">Learn Forever.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              KnowHack preserves the knowledge behind every hackathon project — the research,
              stack, and lessons — so a weekend build compounds into a lifetime asset.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gradient-bg text-white shadow-elegant hover:opacity-95">
                <Link to="/signup">Start your vault <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/discover">Browse projects</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex -space-x-1.5">
                {["AM", "SC", "LN", "PR"].map((a, i) => (
                  <div key={i} className="grid h-6 w-6 place-items-center rounded-full border-2 border-background gradient-bg text-[9px] font-semibold text-white">{a}</div>
                ))}
              </div>
              <span>Trusted by 48k+ builders across 340 universities</span>
            </div>
          </motion.div>

          {/* Hero preview card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto mt-16 max-w-5xl"
          >
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/25 to-accent/25 blur-3xl" />
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
              <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div className="mx-auto rounded-md border border-border bg-background px-3 py-0.5 text-[11px] text-muted-foreground">knowhack.ai/discover</div>
              </div>
              <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-3">
                {previewProjects.slice(0, 3).map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} />
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="mt-24">
          <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:grid-cols-2 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="text-center md:text-left"
              >
                <div className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-24 scroll-mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">Everything you need</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A canonical home for what you built</h2>
            <p className="mt-3 text-muted-foreground">Stop losing your best work in old Google Drives and Devpost pages.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = iconMap[f.icon] ?? Sparkles;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.05 }}
                  className="group card-lift rounded-2xl border border-border/60 bg-card p-6 shadow-card"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl gradient-bg text-white shadow-elegant">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-24 scroll-mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">How it works</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Four steps from build to archive</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06 }}
                className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-card"
              >
                <div className="text-xs font-semibold tracking-wider text-primary">{s.step}</div>
                <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured projects */}
        <section className="mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Featured projects</h2>
              <p className="mt-2 text-muted-foreground">A curated cross-section of standout builds this season.</p>
            </div>
            <Link to="/discover" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">Loved by builders</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Where hackathon work goes to live</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border/60 bg-card p-6 shadow-card"
              >
                <Quote className="h-5 w-5 text-primary/60" />
                <p className="mt-3 text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                  <div className="grid h-9 w-9 place-items-center rounded-full gradient-bg text-xs font-semibold text-white">{t.avatar}</div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing / CTA */}
        <section id="pricing" className="mt-24 scroll-mt-20">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-elegant sm:p-14">
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
            <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Start your vault today.
                </h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Free forever for students. Upload unlimited projects, follow builders, and turn your archive into a portfolio.
                </p>
                <ul className="mt-6 space-y-2">
                  {["Unlimited public projects", "Portfolio-ready pages", "University & mentor spaces", "Export any project as PDF"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="gradient-bg text-white shadow-elegant">
                    <Link to="/signup">Create free account</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/discover">Explore projects</Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="grid gap-3">
                  {["Aarav shipped MedAI Triage", "Sofia archived GreenLedger", "Liam remixed VoiceMesh"].map((line, i) => (
                    <motion.div
                      key={line}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3 backdrop-blur"
                    >
                      <Star className="h-4 w-4 text-primary" />
                      <span className="text-sm">{line}</span>
                      <span className="ml-auto text-xs text-muted-foreground">just now</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}