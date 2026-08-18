# AI Career Companion Agent — AI Internship Application Agent

A modular, production-ready AI Internship Application Agent featuring **Apify-scraped live datasets** and **curated mock datasets**, unified under a robust **Retrieval-Augmented Generation (RAG)** pipeline with **Ollama embeddings**, **ChromaDB vector store**, **FastAPI endpoints**, and a **Conversational Career Assistant Chatbot**.

---

## 1. System Architecture

```text
┌────────────────────────┐      ┌────────────────────────┐
│      Mock Dataset      │      │      Apify Actor       │
│   (250 Curated Jobs)   │      │   (48 Scraped Roles)   │
└───────────┬────────────┘      └───────────┬────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
            ┌───────────────────────────────┐
            │       CombinedJobSource       │
            │    & Data Normalization Layer │
            └───────────────┬───────────────┘
                            ▼
            ┌───────────────────────────────┐
            │   Deterministic Ingestion     │
            │   (Deduplication & Batching)  │
            └───────────────┬───────────────┘
                            ▼
            ┌───────────────────────────────┐
            │    Ollama Embeddings Service  │
            │     (mxbai-embed-large)       │
            └───────────────┬───────────────┘
                            ▼
            ┌───────────────────────────────┐
            │     ChromaDB Vector Store     │
            │ (Standalone HTTP / Embedded)  │
            └───────────────┬───────────────┘
                            ▼
            ┌───────────────────────────────┐
            │      InternshipRetriever      │
            │ (Semantic Search & Filtering) │
            └───────────────┬───────────────┘
                            ▼
       ┌────────────────────┴────────────────────┐
       ▼                                         ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│ Conversational Chatbot  │          │   FastAPI REST Routes   │
│  (CLI Career Assistant) │          │  (/api/internships/...) │
└─────────────────────────┘          └─────────────────────────┘
```

---

## 2. Project Directory Structure

```text
AI-INTERNSHIP-APPLICATION-AGENT/
├── app/
│   ├── __init__.py
│   ├── main.py                         # FastAPI application entry point
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py                     # Authentication HTTP endpoints
│   │   └── internships.py              # Internship Search, Chat, Stats & Ingest endpoints
│   │
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── cookies.py                  # HTTP-only authentication cookies
│   │   ├── dependencies.py             # Authentication dependencies
│   │   ├── jwt.py                      # Access and refresh JWT handling
│   │   ├── password.py                 # Password hashing and verification
│   │   └── service.py                  # Authentication business logic
│   │
│   ├── core/
│   │   ├── config.py                   # App runtime settings
│   │   └── exceptions.py               # Domain exceptions
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py               # PostgreSQL engine and async sessions
│   │   └── repositories/
│   │       ├── __init__.py
│   │       └── user_repository.py      # User persistence operations
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py                     # User and profile models
│   │
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── chatbot.py                  # Conversational Career Assistant RAG Chatbot
│   │   ├── config.py                   # RAG & Chroma configuration
│   │   ├── embeddings.py               # Ollama embedding service (mxbai-embed-large)
│   │   ├── exceptions.py               # RAG domain exceptions
│   │   ├── ingestion.py                # Unified internship ingestion pipeline
│   │   ├── retriever.py                # Semantic retrieval & filtering
│   │   └── vector_store.py             # ChromaDB vector store wrapper
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                     # Authentication schemas
│   │   └── rag.py                      # Internship, Search, Chat, and Ingest schemas
│   │
│   └── scraper/
│       ├── __init__.py
│       ├── apify_scraper.py            # Apify dataset integration & normalization
│       └── mocker_scraper.py           # Curated sample internship dataset (250 jobs)
│
├── tests/
│   ├── __init__.py
│   ├── test_auth.py                    # Authentication tests
│   ├── test_ingestion_sources.py       # Apify scraper and normalization tests
│   ├── test_internships_api.py         # FastAPI internship endpoint integration tests
│   └── rag/
│       ├── __init__.py
│       ├── test_chatbot.py             # Chatbot synthesis and query tests
│       ├── test_config.py              # Configuration tests
│       ├── test_ingestion.py           # Deduplication and batching tests
│       ├── test_retriever.py           # Semantic search and filtering tests
│       └── test_vector_store.py        # Chroma client selection tests
│
├── docker/
│   └── chroma-config.yaml              # Chroma server configuration (CORS enabled)
├── docker-compose.yml                  # Standalone ChromaDB container service
├── pyproject.toml                      # UV dependencies and project metadata
├── uv.lock                             # Locked dependencies
├── .env.example                        # Environment variable template
└── README.md
```

---

## 3. Prerequisites & Environment Setup

### 3.1 Install Python dependencies with `uv`

```powershell
uv sync
```

### 3.2 Environment Configuration (`.env`)

Create or update `.env` in the project root:

```ini
# Application
APP_NAME=AI Internship Agent
DEBUG=true

# PostgreSQL (async SQLAlchemy)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/internship_agent

# JWT
JWT_SECRET_KEY=change-me-to-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Cookies
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
ACCESS_COOKIE_NAME=access_token
REFRESH_COOKIE_NAME=refresh_token

# ChromaDB Configuration ("http" for Docker server, "embedded" for local vector_db/)
CHROMA_MODE=http
CHROMA_HOST=localhost
CHROMA_PORT=6333

# Embedding Configuration
EMBEDDING_MODEL=mxbai-embed-large
OLLAMA_BASE_URL=http://localhost:11434

# Apify Dataset Integration
APIFY_API_TOKEN=your_apify_api_token
APIFY_DATASET_ID=5TBAkpJvTOaP3JkeT
APIFY_BASE_URL=https://api.apify.com/v2
```

---

## 4. Starting Background Services

### 4.1 Start ChromaDB via Docker Compose

```powershell
docker compose up -d
```

Verify that the container is healthy:

```powershell
docker ps
```

> **Note on Healthcheck**: The Chroma Docker container uses a zero-dependency in-container TCP socket check to guarantee accurate health reporting without external packages.

### 4.2 Start Ollama & Pull the Embedding Model

Ensure Ollama is running and download `mxbai-embed-large`:

```powershell
ollama pull mxbai-embed-large
```

---

## 5. Running the Unified Ingestion Pipeline

The ingestion pipeline automatically pulls from **both** the local mock dataset (250 jobs) and the remote Apify dataset (48 jobs), normalizes them to a single schema, eliminates duplicates via SHA-256 document hashing, and writes vectors to ChromaDB.

### Ingest all sources (with fresh collection reset):

```powershell
uv run python -m app.rag.ingestion --reset
```

### Ingest without resetting (idempotent / updates existing):

```powershell
uv run python -m app.rag.ingestion
```

### Ingest a specific source:

```powershell
# Only Apify
uv run python -m app.rag.ingestion --source apify

# Only Mock
uv run python -m app.rag.ingestion --source mock
```

---

## 6. Conversational Career Assistant Chatbot

The chatbot allows natural-language queries over all indexed internship listings with structured role details (title, company, stipend, duration, skills, apply URL, and source):

### Single Query CLI Execution:

```powershell
uv run python -m app.rag.chatbot "Find Python internships"
uv run python -m app.rag.chatbot "Show machine learning internships"
uv run python -m app.rag.chatbot "Client Success in Gurgaon"
uv run python -m app.rag.chatbot "Which internships require Python and SQL?"
uv run python -m app.rag.chatbot "Show internships with a stipend"
```

### Interactive Chat Loop:

```powershell
uv run python -m app.rag.chatbot
```

---

## 7. Running the FastAPI Web Application

Start the FastAPI application with reload:

```powershell
uv run python -m uvicorn app.main:app --reload
```

Interactive API documentation will be available at:
`http://localhost:8000/docs`

### Key Endpoints:

- `POST /api/internships/search` — Semantic similarity search with optional filters (source, skills, location, company).
- `POST /api/internships/chat` — Conversational RAG assistant response for natural language queries.
- `GET /api/internships/stats` — Real-time collection metrics (total count, breakdown per source).
- `POST /api/internships/ingest` — Trigger pipeline ingestion dynamically.

---

## 8. Running Automated Tests

Run the complete test suite (34 unit & integration tests):

```powershell
uv run pytest
```

Run with verbose test reporting:

```powershell
uv run pytest -v
```

---

## 9. Git Push Workflow

To stage and push all changes into your GitHub repository:

```powershell
git status
git add .
git commit -m "feat: integrate Apify dataset into unified RAG pipeline with chatbot, endpoints, and fixed Chroma healthcheck"
git push origin main
```
