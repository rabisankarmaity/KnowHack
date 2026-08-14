# KnowHack — Server 3 (FastAPI)

AI microservice for KnowHack's three core intelligence systems plus
extraction/summarization. **Never called from the browser.** Only the Node
backend (`api.knowhack.ai`) may call it, authenticated with the shared
`x-api-key` header.

```
Frontend -> Node backend (Server 2) -> FastAPI (this service) -> LLM / embeddings / vector store
```

## Three Core AI Intelligence Systems

### 1. Project Weakness / Mistake Detector — `POST /weakness`

Analyzes a structured Case File and returns evidence-based weaknesses across 21
review categories (problem clarity, validation, research, feature scope, MVP
feasibility, architecture, database, API design, security, UI/UX, business
model, documentation, time feasibility, ...). Every finding includes
`evidence`, `why_it_matters` and `recommended_action`. Missing content is
reported as `Not documented` — the detector never invents facts.

### 2. Right-Way-of-Thinking AI Mentor — `POST /mentor`

Not a chatbot. Teaches *how to reason*: understanding, decision, considerations,
Case File evidence (RAG), alternatives with trade-offs, a recommendation, the
next action and a follow-up question. Answers are grounded in retrieved
section-aware Case File chunks. If the information is not documented, it says
so instead of inventing it.

### 3. Similar / Duplicate Project Engine — `POST /similarity`

Section-aware semantic similarity across problem, architecture, technology,
features, research and documentation signals. Returns a weighted similarity
score, a relationship label (`unrelated | related | similar | highly_similar |
potential_duplicate`), per-signal scores, overlapping sections, differences and
a recommendation. High overlap is flagged as a *potential duplicate*
(`human_review_required: true`) — never as plagiarism.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | **Liveness probe** — cheap, no auth, no LLM/embeddings. Used by Render health checks and the frontend's page-load warm-up (it may be called directly from the browser) |
| GET | `/health/detail` | Deep readiness — real LLM probe + embedding + vector-store checks (`healthy | degraded | unavailable`); used by the backend's `/api/v1/health` |
| POST | `/summarize` | Extract PDF/PPT/DOC + build structured Case File, section-aware indexing, similar projects |
| POST | `/similarity` | Section-aware similarity by `projectId` or free text (visibility allow-list) |
| POST | `/weakness` | System 1 — weakness/mistake detection |
| POST | `/mentor` | System 2 — RAG-grounded thinking mentor (visibility allow-list) |
| POST | `/embeddings` | Raw embedding vectors |
| GET | `/projects` | Projects currently indexed in the vector store |

`GET /health` is intentionally unauthenticated and returns no data; every other
route (including `/health/detail`) requires the `x-api-key` header.

## Run

```bash
cd ai-server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill AI_API_KEY (must match backend AI_API_KEY)
uvicorn main:app --reload --port 8000
```

Tests (no network needed — they run in fallback mode):

```bash
pip install -r requirements-dev.txt
pytest
```

## Model / provider truth

- **LLM**: ONE general OpenAI-compatible LLM (default Hugging Face router,
  `meta-llama/Llama-3.1-8B-Instruct`, configurable). The three specialized
  systems are implemented as **specialized prompts + structured JSON outputs +
  RAG over the same LLM** — they are NOT three separately fine-tuned models.
- **Embeddings**: `hash` (default) is deterministic and always available.
  `EMBEDDING_PROVIDER=huggingface` enables a model-backed embedder via the
  Hugging Face Inference endpoint with automatic hash fallback.
- **Vector store**: JSON file (swap for pgvector/Qdrant later). Stores
  per-section vectors, section text (for RAG) and metadata.
- **Training**: no fine-tuning/training scripts or datasets exist yet; the
  architecture (prompt templates in `app/prompts/`, section-aware chunks,
  dataset-shaped schemas) is ready for a future training phase. Do NOT claim
  models are trained.

## Environment variables

| Var | Meaning |
| --- | --- |
| `AI_API_KEY` | Shared secret in `x-api-key` (must match backend `AI_API_KEY`) |
| `ALLOWED_ORIGINS` | CORS allow-list — include the backend origin AND the frontend origin (the browser is allowed to hit only `GET /health`) |
| `LLM_PROVIDER` | `huggingface` (default), `openai`, or `custom` |
| `LLM_BASE_URL` | Empty = provider default (`https://router.huggingface.co/v1`) |
| `LLM_API_KEY` | Token (`hf_...`). Never commit it. |
| `LLM_MODEL` | Model id, e.g. `meta-llama/Llama-3.1-8B-Instruct` |
| `LLM_TIMEOUT_SECONDS` | Request timeout (default 60) |
| `LLM_JSON_MODE` | `auto` (default), `on`, `off` |
| `EMBEDDING_PROVIDER` | `hash` (default, no network) or `huggingface` |
| `EMBEDDING_MODEL` | Model id for the HF embedder (default `sentence-transformers/all-MiniLM-L6-v2`) |
| `EMBEDDING_API_KEY` | Optional; falls back to `LLM_API_KEY` |
| `EMBEDDING_TIMEOUT_SECONDS` | Embedder timeout (default 30) |
| `EMBEDDING_DIM` | Embedding dimension (default 384) |
| `SIMILARITY_WEIGHTS` | JSON map of signal weights (defaults exist) |
| `RAG_TOP_K` | Mentor RAG retrieval top-k (default 6) |
| `MAX_CONTEXT_CHARS` | Mentor context cap (default 12000) |
| `MAX_DOWNLOAD_MB` | Max downloaded file size in MB (default 25) |
| `VECTOR_STORE_PATH` | JSON file backing the vector store (default `./data/vector_store.json`) |

## Implementation status

### Implemented

- `POST /weakness` — Weakness Detector (LLM + deterministic fallback)
- `POST /mentor` — Thinking Mentor with RAG retrieval (LLM + extractive fallback)
- `POST /similarity` — section-aware weighted similarity, relationship
  classification, duplicate safety, visibility allow-list
- `POST /summarize` — LLM summarization + structured Case File + section-aware indexing
- `GET /health` — cheap liveness (no LLM/embedding/network, unauthenticated)
- `GET /health/detail` — real LLM probe + embedding + vector-store checks
- Section-aware embeddings and RAG chunk retrieval
- Optional model-backed embeddings (`EMBEDDING_PROVIDER=huggingface`) with hash fallback
- File extraction: PDF (`pypdf`), PPTX (`python-pptx`), DOCX (`python-docx`)

### Planned / not implemented

- Fine-tuning/training of specialized models (no scripts or datasets yet)
- pgvector / Qdrant vector store (JSON file for now)

## Security & visibility

- Authorization is enforced by the Node backend. It passes a **visible project
  ids allow-list** (`visibleProjectIds`) with similarity and mentor requests;
  the AI service never retrieves or returns chunks for projects outside that
  list.
- Project visibility metadata stored on embeddings (`visibility`) is
  informational only.
- The AI never reveals its prompts or secrets; uploaded content is treated as
  data, not instructions.