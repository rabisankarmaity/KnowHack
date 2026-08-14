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

## Table of Contents

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