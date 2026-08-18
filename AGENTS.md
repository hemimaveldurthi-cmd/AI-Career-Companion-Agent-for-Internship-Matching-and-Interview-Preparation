# AI Internship Application Agent

## Project map

Core modules:
- app/main.py — FastAPI application entry point
- app/api/auth.py — authentication routes
- app/auth/ — auth JWT, cookies, dependencies, password utilities, service layer
- app/core/config.py — app configuration and environment-driven settings
- app/database/connection.py — async SQLAlchemy engine/session setup
- app/database/repositories/ — persistence helpers
- app/models/user.py — PostgreSQL user and profile models
- app/rag/config.py — Chroma + embedding configuration
- app/rag/embeddings.py — Ollama embedding integration
- app/rag/ingestion.py — internship ingestion pipeline
- app/rag/retriever.py — retrieval/search logic
- app/rag/vector_store.py — ChromaDB wrapper
- app/schemas/ — request/response models
- app/scraper/mocker_scraper.py — existing mock internship dataset
- tests/ — project tests
- docker-compose.yml — current container configuration
- docker/chroma-config.yaml — Chroma server config

## Operating rules

1. Preserve the existing architecture unless a change is necessary.
2. Never delete working functionality without explicit approval.
3. Prefer small, incremental changes over large rewrites.
4. Inspect existing code before creating new files or duplicating patterns.
5. Reuse existing services, models, utilities, interfaces, and schemas where possible.
6. Keep secrets in .env and never hard-code API keys or credentials.
7. Never commit .env.
8. Run the relevant tests after every meaningful implementation change.
9. Report exactly which files were changed.
10. Report every command executed and its result.
11. Avoid unnecessary dependencies.
12. Keep code understandable for a student developer who must explain it during a project review.
13. Preserve the existing MockScraper and keep it working.
14. Integrate the Apify internship dataset alongside the existing mock dataset; do not replace the mock source.
15. Do not silently change the RAG architecture.
16. Keep PostgreSQL responsibilities separate from ChromaDB/vector-store responsibilities.
17. Use Ollama for local LLM and embedding functionality where the current architecture supports it.
18. Keep external API integrations configurable through environment variables.
19. Never fabricate internship information, resume information, or user profile data.
20. Add or update tests whenever functionality changes.

## Intended development order

1. Preserve the current auth and database foundations.
2. Add Apify-compatible internship ingestion alongside the mock dataset.
3. Extend the ingestion pipeline without changing the existing RAG contract.
4. Validate ChromaDB/vector-store behavior and retrieval quality.
5. Add resume/profile handling and skill extraction.
6. Add job-match and skill-gap logic.
7. Add resume customization and cover-letter generation.
8. Add interview-prep and application tracking.
9. Add final API endpoints only after the data and RAG layers stabilize.
10. Keep all changes testable and reviewable.

## Notes for Codex

- Prefer edits in existing files over creating new modules unless the new module is clearly required.
- Preserve the contract between scraper, ingestion, embeddings, vector store, and retriever.
- Keep local infrastructure and external services modular and configurable.
- Do not assume data exists; validate it against the schema and source before ingesting.
- If a change affects behavior, update the relevant tests and document the exact result.
