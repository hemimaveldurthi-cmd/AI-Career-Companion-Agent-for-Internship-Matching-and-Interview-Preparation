"""Unit tests for semantic search and retrieval (mocked vector store)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.rag.config import RAGConfig
from app.rag.retriever import InternshipRetriever
from app.schemas.rag import SearchResult


@pytest.fixture
def mock_embedding_service() -> MagicMock:
    service = MagicMock()
    service.embed_query.return_value = [0.1] * 1024
    return service


@pytest.fixture
def mock_vector_store() -> MagicMock:
    store = MagicMock()
    store.similarity_search.return_value = {
        "ids": [["job_1", "job_2"]],
        "documents": [
            [
                "Title: Python Developer Intern\nCompany: Google\nLocation: Bangalore\nSkills: Python, Django\nDescription: Backend dev",
                "Title: Client Success\nCompany: Internshala\nLocation: Gurgaon\nSkills: Communication\nDescription: Client success role",
            ]
        ],
        "metadatas": [
            [
                {
                    "title": "Python Developer Intern",
                    "company": "Google",
                    "location": "Bangalore",
                    "source": "mock",
                    "skills": "Python, Django",
                    "stipend": "₹80,000/month",
                    "duration": "3 months",
                    "apply_url": "https://careers.google.com",
                    "job_type": "internship",
                    "description": "Backend dev",
                },
                {
                    "title": "Client Success",
                    "company": "Internshala",
                    "location": "Gurgaon",
                    "source": "apify",
                    "skills": "Communication",
                    "stipend": "₹18,000 /month",
                    "duration": "6 months",
                    "apply_url": "https://internshala.com/internship/123",
                    "job_type": "internship",
                    "description": "Client success role",
                },
            ]
        ],
        "distances": [[0.2, 0.4]],
    }
    store.get_stats.return_value = {
        "total_count": 298,
        "collection_name": "internships",
        "sources": {"mock": 250, "apify": 48},
    }
    return store


def test_retriever_search_returns_parsed_results(
    mock_embedding_service: MagicMock, mock_vector_store: MagicMock
) -> None:
    retriever = InternshipRetriever(
        config=RAGConfig(),
        embedding_service=mock_embedding_service,
        vector_store=mock_vector_store,
    )

    results = retriever.search("Python backend roles", top_k=2)

    assert len(results) == 2
    assert results[0].job_id == "job_1"
    assert results[0].job.title == "Python Developer Intern"
    assert results[0].job.company == "Google"
    assert results[0].job.source == "mock"
    assert results[0].score == 0.8  # 1.0 - 0.2

    assert results[1].job_id == "job_2"
    assert results[1].job.title == "Client Success"
    assert results[1].job.company == "Internshala"
    assert results[1].job.source == "apify"
    assert results[1].score == 0.6  # 1.0 - 0.4


def test_retriever_search_by_skills(
    mock_embedding_service: MagicMock, mock_vector_store: MagicMock
) -> None:
    retriever = InternshipRetriever(
        config=RAGConfig(),
        embedding_service=mock_embedding_service,
        vector_store=mock_vector_store,
    )

    results = retriever.search_by_skills(["Python", "SQL"])
    assert len(results) == 2
    mock_embedding_service.embed_query.assert_called_with(
        "Internship requiring skills: Python, SQL"
    )


def test_retriever_search_by_location(
    mock_embedding_service: MagicMock, mock_vector_store: MagicMock
) -> None:
    retriever = InternshipRetriever(
        config=RAGConfig(),
        embedding_service=mock_embedding_service,
        vector_store=mock_vector_store,
    )

    results = retriever.search_by_location("Bangalore")
    assert len(results) == 2
    mock_embedding_service.embed_query.assert_called_with("Internship in Bangalore")


def test_retriever_search_by_source(
    mock_embedding_service: MagicMock, mock_vector_store: MagicMock
) -> None:
    retriever = InternshipRetriever(
        config=RAGConfig(),
        embedding_service=mock_embedding_service,
        vector_store=mock_vector_store,
    )

    retriever.search_by_source("Internships", source="apify")
    mock_vector_store.similarity_search.assert_called_once_with(
        [0.1] * 1024, 5, where={"source": "apify"}
    )


def test_retriever_get_stats(
    mock_embedding_service: MagicMock, mock_vector_store: MagicMock
) -> None:
    retriever = InternshipRetriever(
        config=RAGConfig(),
        embedding_service=mock_embedding_service,
        vector_store=mock_vector_store,
    )

    stats = retriever.get_stats()
    assert stats["total_count"] == 298
    assert stats["sources"]["mock"] == 250
    assert stats["sources"]["apify"] == 48
