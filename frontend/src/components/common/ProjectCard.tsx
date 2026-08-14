import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bookmark, Star, Eye } from "lucide-react";
import type { ProjectVM } from "@/lib/project-vm";

export function ProjectCard({
  project,
  index = 0,
}: {
  project: ProjectVM;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.24) }}
    >
      <Link
        to="/projects/$id"
        params={{ id: project.slug }}
        className="group card-lift block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card"
      >
        <div
          className="relative aspect-[16/9] overflow-hidden"
          style={project.coverIsImage ? undefined : { background: project.cover }}
        >
          {project.coverIsImage && (
            <img
              src={project.cover}
              alt={project.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="text-[11px] font-medium uppercase tracking-wider opacity-80">
              {project.category}
            </div>
            <h3 className="mt-0.5 line-clamp-1 text-lg font-semibold">
              {project.title}
            </h3>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {project.tagline || "\u00A0"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {project.tech.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
              >
                {t}
              </span>
            ))}
            {project.tech.length > 3 && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                +{project.tech.length - 3}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full gradient-bg text-[10px] font-semibold uppercase text-white">
                {project.author.avatar.slice(0, 2)}
              </div>
              <div className="text-xs">
                <div className="font-medium leading-tight">{project.author.name}</div>
                <div className="leading-tight text-muted-foreground">
                  {project.hackathon || project.author.university}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {project.stars.toLocaleString()}
              </span>
              <span className="hidden items-center gap-1 sm:flex">
                <Eye className="h-3.5 w-3.5" />
                {project.views >= 1000
                  ? (project.views / 1000).toFixed(1) + "k"
                  : project.views}
              </span>
              <Bookmark className="h-3.5 w-3.5 transition-colors group-hover:text-primary" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}