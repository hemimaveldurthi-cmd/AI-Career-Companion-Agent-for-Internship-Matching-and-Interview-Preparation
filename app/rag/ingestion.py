"""Ingest internship listings into the vector store."""

from __future__ import annotations

import argparse
import logging
from typing import Protocol

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from app.rag.config import RAGConfig
from app.rag.embeddings import EmbeddingService, OllamaEmbeddingService
from app.rag.vector_store import ChromaVectorStore, VectorStore
from app.schemas.rag import InternshipJob
from app.scraper.apify_scraper import ApifyScraper
from app.scraper.mocker_scraper import MockScraper

logger = logging.getLogger(__name__)

BATCH_SIZE = 32


class JobSource(Protocol):
    """Contract for a source of raw internship records."""

    def scraper(self) -> list[dict]:
        """Return raw internship records."""


class CombinedJobSource:
    """Combine mock and Apify internship sources."""

    def __init__(
        self,
        *,
        include_mock: bool = True,
        include_apify: bool = True,
        mock_scraper: MockScraper | None = None,
        apify_scraper: ApifyScraper | None = None,
    ) -> None:
        self.include_mock = include_mock
        self.include_apify = include_apify
        self.mock_scraper = mock_scraper or (MockScraper() if include_mock else None)
        self.apify_scraper = apify_scraper or (ApifyScraper() if include_apify else None)

    def scraper(self) -> list[dict]:
        jobs: list[dict] = []

        # Load sample/mock internships
        if self.include_mock and self.mock_scraper:
            try:
                mock_jobs = self.mock_scraper.scraper()
                jobs.extend(mock_jobs)
                logger.info("Loaded %d records from MockScraper", len(mock_jobs))
            except Exception as exc:
                logger.warning("Mock scraper failed: %s", exc)

        # Load Apify internships
        if self.include_apify and self.apify_scraper:
            try:
                apify_jobs = self.apify_scraper.scraper()
                jobs.extend(apify_jobs)
                logger.info("Loaded %d records from ApifyScraper", len(apify_jobs))
            except Exception as exc:
                logger.warning("Apify scraper failed: %s", exc)

        return jobs


class IngestionPipeline:
    """Load jobs, create embeddings, and persist them."""

    def __init__(
        self,
        config: RAGConfig | None = None,
        job_source: JobSource | None = None,
        embedding_service: EmbeddingService | None = None,
        vector_store: VectorStore | None = None,
    ) -> None:
        self._config = config or RAGConfig()
        self._job_source = job_source or CombinedJobSource()
        self._embeddings = embedding_service or OllamaEmbeddingService(self._config)
        self._store = vector_store or ChromaVectorStore(self._config)

    def run(self, *, reset: bool = False) -> int:
        """Ingest all available jobs and return the number indexed."""
        jobs = self._load_jobs()
        if not jobs:
            logger.warning("No internship jobs found to ingest")
            return 0

        if reset:
            logger.info("Resetting collection '%s' before ingestion...", self._config.collection_name)
            self._store.reset()

        indexed_count = 0
        batches = _chunk(jobs, BATCH_SIZE)
        total_batches = len(batches)

        for i, batch in enumerate(batches, 1):
            documents = [job.to_document_text() for job in batch]
            embeddings = self._embeddings.embed_documents(documents)
            self._store.upsert(
                ids=[job.document_id for job in batch],
                embeddings=embeddings,
                documents=documents,
                metadatas=[job.to_metadata() for job in batch],
            )
            indexed_count += len(batch)
            logger.info(
                "Batch %d/%d indexed (%d of %d internships)",
                i,
                total_batches,
                indexed_count,
                len(jobs),
            )

        return indexed_count

    def _load_jobs(self) -> list[InternshipJob]:
        seen_ids: set[str] = set()
        unique_jobs: list[InternshipJob] = []

        for raw_job in self._job_source.scraper():
            try:
                job = InternshipJob.model_validate(raw_job)
            except Exception as err:
                logger.warning("Skipping malformed job record: %s (Error: %s)", raw_job.get("title"), err)
                continue

            if job.document_id in seen_ids:
                continue
            seen_ids.add(job.document_id)
            unique_jobs.append(job)

        return unique_jobs


def _chunk(items: list[InternshipJob], size: int) -> list[list[InternshipJob]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def ingest_internships(
    *,
    reset: bool = False,
    source: str = "all",
    config: RAGConfig | None = None,
) -> int:
    """Run the internship ingestion pipeline with configurable source selection."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    if source == "mock":
        job_source = CombinedJobSource(include_mock=True, include_apify=False)
    elif source == "apify":
        job_source = CombinedJobSource(include_mock=False, include_apify=True)
    else:
        job_source = CombinedJobSource(include_mock=True, include_apify=True)

    pipeline = IngestionPipeline(config=config, job_source=job_source)
    return pipeline.run(reset=reset)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest internship listings into ChromaDB.")
    parser.add_argument("--reset", action="store_true", help="Reset collection before ingestion")
    parser.add_argument(
        "--source",
        choices=["all", "mock", "apify"],
        default="all",
        help="Source of internships to ingest (default: all)",
    )
    args = parser.parse_args()

    count = ingest_internships(reset=args.reset, source=args.source)
    print(f"\nSuccessfully indexed {count} internships into ChromaDB.")
