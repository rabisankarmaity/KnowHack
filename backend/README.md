# KnowHack — Backend (Server 2)

Node.js + Express + MongoDB backend for KnowHack. Implements authentication,
users, hackathon case-file CRUD, bookmarks, hackathon directory, Cloudinary
uploads, and the **AI gateway** that proxies all AI traffic to the FastAPI
service (Server 3) and enforces visibility.

> The browser NEVER talks to the AI service directly; it only talks to this
> backend. The AI API key lives here, never in the browser.

## Quick start

```bash
cd backend
cp .env.example .env      # fill values
npm install
npm run dev               # http://localhost:5000
```

Health: `GET /health`. Base path: `/api/v1`.

```bash
npm test                  # node --test test/
```

## Folder structure

```
backend/src
  config/         database, cloudinary, jwt, ai
  middlewares/    auth, role, validation, upload, rateLimiter, error
  models/         User, Project, Hackathon, Bookmark
  services/       auth, user, project, hackathon, ai.client, ai.service
  controllers/    thin HTTP layer
  routes/         Express routers mounted under /api/v1
  validators/     express-validator rule sets
  utils/          ApiError, ApiResponse, pagination, slug, logger, visibility
  app.js          Express app (middleware + routes)
  server.js       DB connect + HTTP listen
```

Flow: **Route → Validator → Controller → Service → Model → MongoDB**.

## Response contract

```json
{ "success": true, "message": "...", "data": {}, "pagination": {} }
```

Errors: `{ "success": false, "message": "...", "errors": [] }`.

## AI gateway (Server 3 proxy)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/v1/ai/projects/:id/analyze` | owner/admin | Run/force full AI analysis (summary, case file, metadata, tech stack, section-aware embeddings, similar projects) |
| `GET /api/v1/ai/projects/:id/status` | optionalAuth (visibility-checked) | AI analysis status + persisted snapshot (`idle/processing/ready/failed`) |
| `GET /api/v1/ai/projects/:id/similar` | optionalAuth (visibility-checked) | Similar/duplicate projects — enriched with relationship, signals, overlap analysis; stale snapshot fallback |
| `POST /api/v1/ai/projects/:id/weakness` | owner/admin | System 1 — weakness/mistake detector; result persisted as `ai.weakness`, stale-serveable |
| `POST /api/v1/ai/mentor` | auth | System 2 — RAG-grounded thinking mentor (`{ question, projectId? }`); answers grounded only in visible Case Files |
| `POST /api/v1/ai/similarity` | auth | Free-text similar-project search over visible projects |

Persisted AI results are served as **stale snapshots** (`status: "stale"`)
whenever the AI service is temporarily unavailable, instead of deleting them.

## AI orchestration flow

1. Project created/updated → `queueAnalysis(projectId)` schedules background analysis.
2. `ai.service.js` collects the Case File as **section-aware chunks**
   (`collectSections`) plus uploaded files (PDF/PPT/DOCX handled by Server 3).
3. Server 3 returns a structured case file, summary, highlights, metadata, tech
   stack, and similar projects; section vectors are persisted per-project there.
4. Results are persisted under `project.ai` and served via `/status` and
   `/similar` with stale fallback.
5. Weakness reports persist under `project.ai.weakness`.

## Visibility enforcement

- Visibility rules live in `utils/visibility.js` (`canView`, `isViewerProject`,
  `isAnonymouslyVisible`) and are shared by the project service and AI service.
- `/status` and `/similar` only resolve projects the caller may view.
- Mentor and similarity calls send an **allow-list of visible project ids** to
  the AI service, so private/team-only/unreleased projects can never leak
  through RAG or similarity.
- Similarity results are re-hydrated against MongoDB and re-checked for
  visibility before returning to the client.

## Environment variables

See `.env.example`. AI-specific:

| Var | Meaning |
| --- | --- |
| `AI_SERVICE_URL` | FastAPI AI service base URL, e.g. `http://localhost:8000` |
| `AI_API_KEY` | Shared secret passed as `x-api-key` to the AI service |
| `AI_TIMEOUT_MS` | HTTP timeout (default 120000) |
| `AI_MAX_RETRIES` | Retry count (default 2) |
| `AI_RETRY_DELAY_MS` | Backoff base (default 1500) |

## Health

- `GET /api/v1/health` reports DB, Cloudinary and AI-service checks. The AI
  check maps Server 3's `healthy | degraded | unavailable` status onto a
  boolean `ok`.

## Tests

```bash
npm test
```

`test/ai.service.test.js` covers the deterministic AI helpers
(`collectSections`, `collectMetadata`, `collectFiles`) with no DB required.

## Implementation status

- **Implemented** — AI gateway proxy with retries; section-aware collection;
  weakness detector route; RAG-grounded mentor route; enriched similar/duplicate
  route with stale fallback; visibility enforcement; health mapping.
- **Planned** — optional fine-tuned models (the AI service uses the shared LLM
  with specialized prompts/RAG; no trained models exist).

## Security notes

- `.env` is gitignored; never commit secrets.
- JWT auth, role checks, rate limiting, helmet, CORS allow-list.
- The AI API key never leaves this service.
- Uploaded Case File content is treated as data, never as instructions.