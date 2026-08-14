import type { ProjectDTO, UserDTO } from "./api/types";

// Stable gradient palette used when a project has no cover image.
const GRADIENTS = [
  "linear-gradient(135deg,#4F46E5,#8B5CF6)",
  "linear-gradient(135deg,#0ea5e9,#8B5CF6)",
  "linear-gradient(135deg,#f43f5e,#8B5CF6)",
  "linear-gradient(135deg,#10b981,#4F46E5)",
  "linear-gradient(135deg,#f59e0b,#f43f5e)",
  "linear-gradient(135deg,#06b6d4,#4F46E5)",
  "linear-gradient(135deg,#a855f7,#ec4899)",
  "linear-gradient(135deg,#22d3ee,#4F46E5)",
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function fallbackCover(seed: string) {
  return GRADIENTS[hash(seed) % GRADIENTS.length];
}

export function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export interface ProjectVM {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  cover: string;
  coverIsImage: boolean;
  category: string;
  hackathon: string;
  year?: number;
  difficulty: string;
  tech: string[];
  author: { name: string; avatar: string; university: string };
  stars: number;
  views: number;
  bookmarks: number;
}

export function toProjectVM(p: ProjectDTO): ProjectVM {
  const owner = (typeof p.owner === "object" ? p.owner : undefined) as
    | UserDTO
    | undefined;
  const tech = [
    ...(p.techStack?.languages ?? []),
    ...(p.techStack?.frameworks ?? []),
  ];
  const hasImage = Boolean(p.coverImage || p.thumbnail);
  return {
    id: p._id,
    slug: p.slug,
    title: p.title,
    tagline: p.shortDescription || "",
    cover: hasImage ? (p.coverImage || p.thumbnail!) : fallbackCover(p.slug || p._id),
    coverIsImage: hasImage,
    category: p.category || "General",
    hackathon: p.hackathonName || "",
    year: p.year,
    difficulty: p.difficulty ?? "intermediate",
    tech: tech.length ? tech : ["—"],
    author: {
      name: owner?.name || "Unknown",
      avatar: owner?.avatar || initials(owner?.name),
      university: owner?.college || "",
    },
    stars: p.likes ?? 0,
    views: p.views ?? 0,
    bookmarks: p.bookmarks ?? 0,
  };
}