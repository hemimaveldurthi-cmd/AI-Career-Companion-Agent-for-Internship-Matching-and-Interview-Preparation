"""Unit tests for ingestion pipeline, source combination, and duplicate handling."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.rag.config import RAGConfig
from app.rag.ingestion import CombinedJobSource, IngestionPipeline
from app.schemas.rag import InternshipJob


class DummyScraper:
    def __init__(self, jobs: list[dict]) -> None:
        self._jobs = jobs

    def scraper(self) -> list[dict]:
        return self._jobs


def test_combined_job_source_aggregates_sources() -> None:
    mock_src = DummyScraper([
        {
            "title": "Mock Role",
            "company": "Mock Co",
            "description": "Mock desc",
            "skills_required": ["Python"],
            "location": "Remote",
            "apply_url": "https://example.com/1",
            "source": "mock",
        }
    ])
    apify_src = DummyScraper([
        {
            "title": "Apify Role",
            "company": "Apify Co",
            "description": "Apify desc",
            "skills_required": ["SQL"],
            "location": "Gurgaon",
            "apply_url": "https://example.com/2",
            "source": "apify",
        }
    ])

    combined = CombinedJobSource(
        include_mock=True,
        include_apify=True,
        mock_scraper=mock_src,  # type: ignore[arg-type]
        apify_scraper=apify_src,  # type: ignore[arg-type]
    )

    all_jobs = combined.scraper()
    assert len(all_jobs) == 2
    assert all_jobs[0]["source"] == "mock"
    assert all_jobs[1]["source"] == "apify"


def test_ingestion_pipeline_deduplicates_identical_jobs() -> None:
    job = {
        "title": "Duplicate Role",
        "company": "Dup Corp",
        "description": "Duplicate description",
        "skills_required": ["Python"],
        "location": "Remote",
        "apply_url": "https://example.com/dup",
        "source": "mock",
    }
    # Duplicate job 3 times in source
    source = DummyScraper([job, job, job])

    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.return_value = [[0.1] * 10]
    mock_store = MagicMock()

    pipeline = IngestionPipeline(
        config=RAGConfig(),
        job_source=source,  # type: ignore[arg-type]
        embedding_service=mock_embeddings,
        vector_store=mock_store,
    )

    indexed = pipeline.run(reset=False)

    # Should only index 1 unique job, not 3
    assert indexed == 1
    assert mock_store.upsert.call_count == 1
    mock_store.reset.assert_not_called()


def test_ingestion_pipeline_with_reset() -> None:
    job = {
        "title": "Software Intern",
        "company": "Tech Corp",
        "description": "Dev intern",
        "skills_required": ["C++"],
        "location": "Remote",
        "apply_url": "https://example.com/tech",
        "source": "mock",
    }
    source = DummyScraper([job])
    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.return_value = [[0.1] * 10]
    mock_store = MagicMock()

    pipeline = IngestionPipeline(
        config=RAGConfig(),
        job_source=source,  # type: ignore[arg-type]
        embedding_service=mock_embeddings,
        vector_store=mock_store,
    )

    indexed = pipeline.run(reset=True)

    assert indexed == 1
    mock_store.reset.assert_called_once()
