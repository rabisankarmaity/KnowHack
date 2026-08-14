export type Project = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  cover: string;
  author: { name: string; avatar: string; university: string };
  hackathon: string;
  year: number;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tech: string[];
  tags: string[];
  stars: number;
  views: number;
  bookmarks: number;
  featured?: boolean;
  trending?: boolean;
};

const covers = [
  "linear-gradient(135deg,#4F46E5,#8B5CF6)",
  "linear-gradient(135deg,#0ea5e9,#8B5CF6)",
  "linear-gradient(135deg,#f43f5e,#8B5CF6)",
  "linear-gradient(135deg,#10b981,#4F46E5)",
  "linear-gradient(135deg,#f59e0b,#f43f5e)",
  "linear-gradient(135deg,#06b6d4,#4F46E5)",
  "linear-gradient(135deg,#a855f7,#ec4899)",
  "linear-gradient(135deg,#22d3ee,#4F46E5)",
];

const authors = [
  { name: "Aarav Mehta", avatar: "AM", university: "IIT Bombay" },
  { name: "Sofia Chen", avatar: "SC", university: "MIT" },
  { name: "Liam Novak", avatar: "LN", university: "Stanford" },
  { name: "Priya Rao", avatar: "PR", university: "NUS Singapore" },
  { name: "Marco Silva", avatar: "MS", university: "ETH Zürich" },
  { name: "Emma Dubois", avatar: "ED", university: "Oxford" },
];

export const projects: Project[] = [
  {
    id: "medai-triage",
    title: "MedAI Triage",
    tagline: "AI-powered emergency triage in under 30 seconds.",
    description: "A hospital-grade triage assistant that classifies patient urgency from symptoms, vitals, and voice cues — deployed across 3 pilot ERs.",
    cover: covers[0],
    author: authors[0],
    hackathon: "HackMIT 2025",
    year: 2025,
    category: "Healthcare",
    difficulty: "Advanced",
    tech: ["React", "FastAPI", "PyTorch", "Postgres", "Redis"],
    tags: ["AI", "Health", "Realtime"],
    stars: 1284,
    views: 24310,
    bookmarks: 412,
    featured: true,
    trending: true,
  },
  {
    id: "greenledger",
    title: "GreenLedger",
    tagline: "Transparent carbon accounting on-chain.",
    description: "Verifiable carbon-credit ledger using zk-proofs and IoT sensor attestation — winner of the Sustainability track.",
    cover: covers[3],
    author: authors[1],
    hackathon: "ETHGlobal 2024",
    year: 2024,
    category: "Climate",
    difficulty: "Advanced",
    tech: ["Next.js", "Solidity", "Circom", "IPFS"],
    tags: ["Web3", "Climate", "ZK"],
    stars: 892,
    views: 15420,
    bookmarks: 231,
    featured: true,
  },
  {
    id: "studysprint",
    title: "StudySprint",
    tagline: "Turn any PDF into an adaptive study plan.",
    description: "Uploads a syllabus and generates spaced-repetition flashcards, quizzes, and 7-day study sprints tailored to exam dates.",
    cover: covers[6],
    author: authors[2],
    hackathon: "TreeHacks 2025",
    year: 2025,
    category: "Education",
    difficulty: "Intermediate",
    tech: ["React", "TypeScript", "Supabase", "Tailwind"],
    tags: ["EdTech", "Productivity"],
    stars: 634,
    views: 9820,
    bookmarks: 178,
    featured: true,
    trending: true,
  },
  {
    id: "voicemesh",
    title: "VoiceMesh",
    tagline: "Peer-to-peer voice rooms with zero servers.",
    description: "WebRTC-based mesh audio with adaptive bitrate — 12-person rooms with sub-80ms latency, no backend required.",
    cover: covers[5],
    author: authors[3],
    hackathon: "HackTheNorth 2024",
    year: 2024,
    category: "Developer Tools",
    difficulty: "Advanced",
    tech: ["WebRTC", "Rust", "WASM", "Svelte"],
    tags: ["P2P", "Audio"],
    stars: 1520,
    views: 31200,
    bookmarks: 502,
    trending: true,
  },
  {
    id: "farmpulse",
    title: "FarmPulse",
    tagline: "Satellite + soil sensors for smallholder farms.",
    description: "Combines Sentinel-2 imagery with $8 soil probes to give farmers weekly irrigation and pest guidance over SMS.",
    cover: covers[4],
    author: authors[4],
    hackathon: "NASA Space Apps 2024",
    year: 2024,
    category: "Agriculture",
    difficulty: "Intermediate",
    tech: ["Python", "Django", "GDAL", "Twilio"],
    tags: ["AgriTech", "IoT"],
    stars: 421,
    views: 7280,
    bookmarks: 96,
  },
  {
    id: "loomlens",
    title: "LoomLens",
    tagline: "Auto-generate loom-style walkthroughs from PR diffs.",
    description: "Records a narrated screen-capture of any pull request in under 2 minutes using a local Whisper + Playwright pipeline.",
    cover: covers[7],
    author: authors[5],
    hackathon: "GitHub Universe 2025",
    year: 2025,
    category: "Developer Tools",
    difficulty: "Intermediate",
    tech: ["Playwright", "Whisper", "Electron"],
    tags: ["DX", "AI"],
    stars: 356,
    views: 5410,
    bookmarks: 74,
    trending: true,
  },
  {
    id: "civicsignal",
    title: "CivicSignal",
    tagline: "Real-time potholes & outage reports for city halls.",
    description: "Citizens tag issues via WhatsApp; a lightweight dashboard routes them to the right municipal team with SLA tracking.",
    cover: covers[1],
    author: authors[0],
    hackathon: "MLH Fellowship 2024",
    year: 2024,
    category: "Civic Tech",
    difficulty: "Beginner",
    tech: ["Node", "Express", "Mapbox", "Postgres"],
    tags: ["Civic", "Maps"],
    stars: 214,
    views: 3120,
    bookmarks: 48,
  },
  {
    id: "quantumsketch",
    title: "QuantumSketch",
    tagline: "Draw circuits, run them on real qubits.",
    description: "Visual quantum-circuit editor that compiles to Qiskit and executes on IBM's public backends with cost estimation.",
    cover: covers[2],
    author: authors[1],
    hackathon: "QHack 2025",
    year: 2025,
    category: "Research",
    difficulty: "Advanced",
    tech: ["React", "Qiskit", "Python", "WebSockets"],
    tags: ["Quantum", "EdTech"],
    stars: 703,
    views: 11800,
    bookmarks: 189,
    featured: true,
  },
];

export const testimonials = [
  { name: "Dr. Rina Kapoor", role: "Professor, IIT Delhi", avatar: "RK", quote: "KnowHack turned our post-hackathon graveyard into a living archive. Students actually revisit their work now." },
  { name: "Jason Park", role: "Engineer, Vercel", avatar: "JP", quote: "The best repository of student engineering I've seen. It's like reading a great changelog of ambition." },
  { name: "Amelia Foster", role: "MLH Coach", avatar: "AF", quote: "Finally — a place where a weekend project can become a two-year journey. Every mentor should recommend this." },
];

export const stats = [
  { label: "Projects preserved", value: "12,480" },
  { label: "Universities", value: "340+" },
  { label: "Hackathons indexed", value: "1,200" },
  { label: "Contributors", value: "48k" },
];

export const features = [
  { title: "Structured Archive", desc: "Every project captures problem, research, tech, and lessons — not just a README.", icon: "Archive" },
  { title: "Reusable Blueprints", desc: "Fork architecture, tech-stack decisions, and pitfalls from projects that already shipped.", icon: "Layers" },
  { title: "Deep Search", desc: "Filter across 12,000+ projects by tech, hackathon, university, difficulty, and outcome.", icon: "Search" },
  { title: "Contribution Graph", desc: "Track your build history like a green-square garden — for hackathon work.", icon: "GitBranch" },
  { title: "Team & Mentors", desc: "Follow builders, mentors, and cohorts. Comment, remix, and cite prior work.", icon: "Users" },
  { title: "Portfolio-ready", desc: "Every project ships with a shareable page — recruiter-friendly by default.", icon: "Award" },
];

export const howItWorks = [
  { step: "01", title: "Capture", desc: "Upload a project through the guided 9-step wizard — details, research, files, and lessons." },
  { step: "02", title: "Structure", desc: "KnowHack organizes it into a canonical layout used by every archived project." },
  { step: "03", title: "Share", desc: "Publish publicly, to your university, or keep private. Get a portfolio-grade page for free." },
  { step: "04", title: "Reuse", desc: "Discover, fork ideas, cite prior work — turn a weekend build into a compounding asset." },
];

export const hackathons = [
  { name: "HackMIT 2026", date: "Sep 12–14", location: "Cambridge, MA", prize: "$50k" },
  { name: "ETHGlobal Delhi", date: "Oct 3–5", location: "New Delhi", prize: "$150k" },
  { name: "TreeHacks", date: "Feb 20–22", location: "Stanford", prize: "$40k" },
  { name: "PennApps XXV", date: "Nov 8–10", location: "Philadelphia", prize: "$30k" },
];

export const activity = [
  { icon: "Star", text: "You starred", target: "MedAI Triage", time: "2h ago" },
  { icon: "Upload", text: "You published", target: "Chatterbox v2", time: "1d ago" },
  { icon: "MessageSquare", text: "Marco Silva commented on", target: "FarmPulse", time: "2d ago" },
  { icon: "Bookmark", text: "You bookmarked", target: "QuantumSketch", time: "3d ago" },
  { icon: "GitBranch", text: "You forked ideas from", target: "GreenLedger", time: "5d ago" },
];

export const notifications = [
  { id: "n1", type: "mention", title: "Sofia Chen mentioned you", desc: "\"Great point on the retrieval eval — mind sharing the notebook?\"", time: "12m ago", unread: true },
  { id: "n2", type: "star", title: "Your project reached 1,000 stars", desc: "MedAI Triage crossed 1k stars 🎉", time: "3h ago", unread: true },
  { id: "n3", type: "comment", title: "New comment on StudySprint", desc: "Liam Novak: \"Have you tried spaced repetition intervals from Anki?\"", time: "1d ago", unread: true },
  { id: "n4", type: "system", title: "Weekly digest is ready", desc: "12 new projects in your tracked categories.", time: "2d ago", unread: false },
  { id: "n5", type: "follow", title: "Amelia Foster started following you", desc: "MLH Coach • 4 mutual", time: "4d ago", unread: false },
  { id: "n6", type: "system", title: "New hackathon: HackMIT 2026", desc: "Registration opens Aug 1.", time: "1w ago", unread: false },
];

export const badges = [
  { name: "First Ship", icon: "Rocket", color: "from-indigo-500 to-violet-500" },
  { name: "Hackathon Vet", icon: "Trophy", color: "from-amber-500 to-orange-500" },
  { name: "1k Stars", icon: "Star", color: "from-yellow-400 to-amber-500" },
  { name: "Mentor", icon: "Compass", color: "from-emerald-500 to-teal-500" },
  { name: "Open Source", icon: "GitBranch", color: "from-pink-500 to-rose-500" },
  { name: "Top 100", icon: "Crown", color: "from-fuchsia-500 to-purple-500" },
];

export const skills = ["TypeScript", "React", "Python", "PyTorch", "Postgres", "System Design", "WebRTC", "Rust"];

export const currentUser = {
  name: "Aarav Mehta",
  handle: "aarav",
  avatar: "AM",
  bio: "Building tools at the intersection of ML and healthcare. IIT Bombay '25. Hackathon lifer.",
  university: "IIT Bombay",
  contribution: 78,
  streak: 41,
  totalProjects: 12,
};