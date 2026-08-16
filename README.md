# KnowHack

**Build Once. Learn Forever.**

KnowHack is a monorepo platform that preserves the knowledge behind every
hackathon project — the research, tech stack, architecture, and lessons — so a
weekend build compounds into a lifetime, portfolio-ready asset. Projects are
captured through a guided wizard, structured into a canonical **Case File**,
enriched by an AI service, and shared with fine-grained visibility.

> Root README. See also [`backend/README.md`](backend/README.md) and
> [`ai-server/README.md`](ai-server/README.md) for service-level docs.

---

## 👥 Team & Project Information

| | |
| --- | --- |
| **Team Name** | Fourpod |
| **Project Name** | KnowHack |
| **Track** | Open Innovation |

> Build any innovative solution that solves a meaningful real-world problem, regardless of domain.

**Example domains include:** EdTech, Consumer Applications, Developer Tools, Startup Products, and Cross-Domain Solutions.

### Team Members & Roles

| Role | Name | Responsibilities |
| --- | --- | --- |
| Team Lead | Aritra Mukherjee | Research, product strategy, project execution, team coordination, documentation, and overall solution development |
| Team Member | Rabi Sankar Maity | UI/UX, presentation design, user experience roadmap, visual design, and product experience |
| Team Member | Deb Sankar Das | Video production, security, trust layer, technical demonstrations, and security-focused implementation |
| Team Member | Apurba Pramanik | AI workflow, AI integration, AI pipeline design, and technical documentation |

#### Team Lead — Aritra Mukherjee

**Email:** `aritramukherjee1509@gmail.com` · **Contact:** `6296072284`

**Role:** Team Lead, Product Strategy, Research & Overall Solution Development

**Responsibilities:**

- Led the overall research and problem-solving process behind KnowHack.
- Coordinated the team's technical and non-technical activities throughout the project.
- Directed the overall product vision, feature planning, and solution strategy.
- Coordinated project execution and ensured that different components worked together as one complete solution.
- Contributed to research, ideation, system planning, and product development.
- Oversaw project documentation and ensured that technical and presentation materials remained consistent.
- Managed task distribution and coordination between team members.
- Worked across different stages of development to resolve blockers and maintain project progress.
- Helped connect the AI workflow, product experience, security/trust concepts, documentation, and presentation into a unified solution.
- Took overall responsibility for the final solution, project execution, and hackathon deliverables.

#### Team Member — Rabi Sankar Maity

**Email:** `rabisankarmaityofficial@gmail.com` · **Contact:** `8101633952`

**Role:** UI/UX Design, Presentation Design, User Experience & Product Experience

**Responsibilities:**

- Designed and refined the user interface and overall visual experience of KnowHack.
- Worked on UI/UX concepts to make the platform intuitive, accessible, and easy to navigate.
- Designed the visual structure and presentation of major product features.
- Developed and refined the **PowerPoint presentation (PPT)** for project demonstrations and hackathon pitching.
- Worked on user experience flows and helped define how users move through different parts of the platform.
- Contributed to the **User Experience roadmap**, identifying opportunities to improve usability and engagement.
- Focused on information hierarchy, layout, visual consistency, and interaction design.
- Helped translate complex technical functionality into a clear and understandable user-facing experience.
- Collaborated with the development team to ensure the implemented interface aligned with the intended design and product vision.
- Contributed to visual storytelling for the hackathon presentation, demonstrations, and project showcase.

#### Team Member — Deb Sankar Das

**Email:** `debsankar999@gmail.com` · **Contact:** `8777735491`

**Role:** Video Production, Security & Trust Layer

**Responsibilities:**

- Led the project's video editing and visual storytelling activities.
- Edited and prepared project demonstration videos for presentations and hackathon submissions.
- Worked on structuring technical demonstrations so that the project's core value could be communicated clearly.
- Contributed to the design and implementation of the **security layer** of the platform.
- Focused on security-related considerations across the system and helped identify potential risks and vulnerabilities.
- Contributed to the development of the **Trust Layer**, supporting reliability, transparency, and user confidence within the platform.
- Worked on concepts related to secure handling of project information and user interactions.
- Helped communicate security and trust mechanisms through documentation, visual materials, and demonstrations.
- Collaborated with the AI and development team to ensure security and trust considerations were integrated into the broader system design.

#### Team Member — Apurba Pramanik

**Email:** `pramanikapurba2005@gmail.com` · **Contact:** `8910817875`

**Role:** AI Workflow, AI Integration & Technical Documentation

**Responsibilities:**

- Designed and coordinated the AI workflow used within KnowHack.
- Worked on the integration and orchestration of AI-powered functionality.
- Helped define how AI processes information, generates insights, and supports the platform's core features.
- Contributed to designing structured AI pipelines and workflows for different project-related use cases.
- Worked on AI-related logic, experimentation, and integration with the broader application architecture.
- Helped ensure that AI capabilities were connected effectively with the platform's user experience and backend systems.
- Contributed to technical documentation covering AI workflows, system functionality, and implementation details.
- Worked on documenting technical processes so that the project could be understood and maintained more easily.
- Collaborated with the team to refine AI functionality based on the project's goals and user requirements.

---

## Table of Contents

- [Team & Project Information](#team--project-information)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Features](#features)
- [Three Core AI Intelligence Systems](#three-core-ai-intelligence-systems)
- [Frontend Routes](#frontend-routes)
- [Backend API Reference](#backend-api-reference)
- [AI Service API Reference](#ai-service-api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Implementation Status](#implementation-status)
- [Roadmap](#roadmap)

---

## Architecture

The platform is split into **three services** that never mix concerns:

```
Frontend (React 19 + TanStack)
        │  HTTP + cookies
        ▼
Node.js / Express backend (MongoDB, JWT, Cloudinary, rate limiting)
        │  x-api-key (never exposed to the browser)
        ▼
FastAPI AI service (LLM / embeddings / vector store / RAG)
```

The backend is the **AI gateway / proxy**: the browser never calls the AI
service directly, and the AI key never leaves the backend.

## Repository Layout

```
frontend/          # Server 1 — Frontend (React 19 + TanStack Router/Query/Start)
backend/           # Server 2 — Node.js + Express + MongoDB
ai-server/         # Server 3 — FastAPI AI microservice
```

## Features

- [x] Guided Case File wizard
- [x] Public project pages with file downloads
- [x] AI summary + insight cards
- [x] Bookmarking
- [x] Hackathon directory
- [x] Fine-grained project visibility (`public` … `private`, `scheduled`)
- [x] AI analysis (summary + Case File extraction + tech-stack detection)
- [x] Similar / duplicate project search
- [x] Weakness detector
- [x] RAG-grounded AI mentor chat
- [x] Section-aware embeddings
- [x] Stale snapshot fallback (AI results persist and survive outages)
- [x] Visibility-aware AI retrieval (allow-lists)
- [x] Health endpoints with real LLM probe
- [x] Hugging Face + OpenAI-compatible LLM providers with deterministic fallback

## Three Core AI Intelligence Systems

### 1. Project Weakness / Mistake Detector

Analyzes a Case File and finds mistakes, missing evidence, technical risks,
scope problems and documentation gaps across 21 review categories. Every
finding cites **evidence** from the Case File (or `Not documented`) and explains
**why it matters**, with a recommended action and priority.

Inputs: Case File + project metadata. Outputs: overall score, severity,
weaknesses, missing sections, scope/technical/security/business risks, quick
fixes, pre-submission checklist.

### 2. Right-Way-of-Thinking AI Mentor

Not a chatbot. Teaches *how to reason* about project decisions: why it matters,
what to consider, alternatives and trade-offs, a recommended direction, the
next action, and a follow-up question. Answers are **grounded in retrieved
Case File sections (RAG)** and never encourage copying. Undocumented details
are reported as undocumented.

### 3. Similar / Duplicate Project Engine

Finds related and potentially overlapping projects using **section-aware
semantic embeddings** across problem, architecture, technology, features,
research and documentation. Outputs a weighted similarity score, relationship
classification (`unrelated | related | similar | highly_similar |
potential_duplicate`), per-signal scores, overlapping areas, differences, and a
recommendation. High overlap is flagged for human review as a *potential
duplicate* — never as plagiarism.

## Frontend Routes

- `/` — Landing
- `/signup`, `/login` — Auth
- `/app/dashboard` — Dashboard
- `/app/discover` — Discover
- `/app/projects/:slug` — Case File details (AI summary, weakness report, insights, mentor chat, similar projects)
- `/app/profile`, `/app/settings`, `/app/notifications` — Account
- `/app/upload` — Case File wizard (with AI review step)

## Backend API Reference

Base path `/api/v1`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Register |
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/refresh` | Refresh tokens |
| `POST` | `/api/v1/auth/logout` | Logout |
| `GET/PUT` | `/api/v1/users/me` | Profile |
| `GET` | `/api/v1/users/:username` | Public profile |
| `GET/POST` | `/api/v1/projects` | List / create projects |
| `GET` | `/api/v1/projects/:slug` | Case File detail (visibility-checked) |
| `PUT/DELETE` | `/api/v1/projects/:id` | Update / delete |
| `POST` | `/api/v1/projects/uploads` | Cloudinary uploads |
| `POST` | `/api/v1/ai/projects/:id/status` | AI status + persisted snapshot (visibility-checked) |
| `POST` | `/api/v1/ai/projects/:id/analyze` | Run AI analysis (owner/admin) |
| `GET` | `/api/v1/ai/projects/:id/similar` | Similar / duplicate projects |
| `POST` | `/api/v1/ai/projects/:id/weakness` | Weakness detector (owner/admin) |
| `POST` | `/api/v1/ai/mentor` | RAG-grounded mentor |
| `POST` | `/api/v1/ai/similarity` | Free-text similar search |
| `GET` | `/api/v1/health` | DB + Cloudinary + AI health |

## AI Service API Reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness (cheap, unauthenticated, used by browser warm-up + Render health checks) |
| `POST` | `/summarize` | Extract files + structured Case File + section-aware indexing |
| `POST` | `/similarity` | Section-aware weighted similarity (allow-list) |
| `POST` | `/weakness` | Weakness detector |
| `POST` | `/mentor` | RAG-grounded mentor (allow-list) |
| `POST` | `/embeddings` | Raw embeddings |
| `GET` | `/projects` | Indexed projects |

> `/health` is a cheap liveness probe (no LLM, no embeddings, no auth). The
> deep `healthy | degraded | unavailable` checks moved to `GET /health/detail`,
> which only the backend's `/api/v1/health` calls.

## Getting Started

```bash
# 1. Backend
git clone <repo>
cd backend && cp .env.example .env && npm install && npm run dev

# 2. AI server
cd ai-server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill AI_API_KEY (must match backend AI_API_KEY) + LLM_API_KEY
uvicorn main:app --reload --port 8000

# 3. Frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```

## Deployment (Render)

This repo deploys as **three separate dynamic services** on Render, each with its
own **Root Directory** so a single git repo maps to one service per folder. No
service is a static site: the frontend does SSR, and the backend / AI service
run long-lived servers.

| Service | Render type | Root directory | Build command | Start command |
| --- | --- | --- | --- | --- |
| Frontend | **Web Service** (Node) | `frontend` | `npm install && npm run build` | `node .output/server/index.mjs` |
| Backend | **Web Service** (Node) | `backend` | `npm install` | `npm start` |
| AI server | **Web Service** (Python) | `ai-server` | `pip install -r requirements.txt` | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

**Why dynamic services (not static)?** The frontend is a TanStack Start/SRR app
(`frontend/vite.config.ts` builds a Nitro `node-server` output in `.output/`);
it needs a running Node process, so it uses Render's **Web Service** type rather
than a Static Site. The MongoDB database is external (MongoDB Atlas or Render's
managed MongoDB).

See [`render.yaml`](render.yaml) for a complete blueprint, and the per-service
`.env.example` files for every required environment variable. Key wiring:

- `CLIENT_ORIGIN` (backend) and `VITE_API_URL` (frontend) must point at the same
  deployed origin + API base path (e.g. `https://knowhack-backend.onrender.com`).
- `AI_SERVICE_URL` (backend) must point at the AI service's public URL.
- `ALLOWED_ORIGINS` (ai-server) must include the backend's public URL **and** the
  frontend's public URL (the browser calls only the cheap `GET /health` liveness
  endpoint to wake the AI service on page load).
- `VITE_AI_SERVICE_URL` (frontend) must point at the AI service's public URL
  (wake-up only — AI data endpoints stay protected behind the backend proxy).

## Environment Variables

| File | Key variables |
| --- | --- |
| `backend/.env` | `MONGODB_URI`, `JWT_*`, `CLOUDINARY_*`, `AI_SERVICE_URL`, `AI_API_KEY`, `AI_HEALTH_TIMEOUT_MS`, `CLIENT_ORIGIN` |
| `ai-server/.env` | `AI_API_KEY`, `ALLOWED_ORIGINS`, `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `EMBEDDING_PROVIDER`, `SIMILARITY_WEIGHTS`, `VECTOR_STORE_PATH` |
| `frontend/.env` | `VITE_API_URL`, `VITE_AI_SERVICE_URL` |

See `backend/.env.example`, `ai-server/.env.example`, and `frontend/.env.example`
for the full lists.

## Implementation Status

- **Implemented** — AI server with three core pipelines (weakness detector,
  thinking mentor with RAG, similar/duplicate engine), section-aware
  embeddings, visibility-aware proxying, stale snapshot fallback, health
  checks, deterministic fallbacks for every AI operation.
- **Implemented — requires LLM credentials** — all LLM-powered paths
  (`LLM_API_KEY`/`LLM_BASE_URL`); without them the AI service runs in
  deterministic extractive/hash fallback mode.
- **Planned** — specialized model fine-tuning/training. Current inference uses
  ONE general LLM (Hugging Face router default) with specialized prompts +
  structured outputs + RAG. No models are trained; no accuracy/F1 claims are
  made.
- **Planned** — pgvector/Qdrant vector store (JSON file currently).

## Roadmap

- Add fine-tuning infrastructure for the three specialized systems
- Swap JSON vector store for pgvector/Qdrant
- University/campus verification for `campus-only` visibility
- Team collaboration model for `team-only` visibility