"""Integration tests for internship FastAPI endpoints."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.rag import InternshipJob, SearchResult


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_search_internships_endpoint(client: TestClient) -> None:
    mock_retriever = MagicMock()
    mock_retriever.search.return_value = [
        SearchResult(
            job_id="job_1",
            score=0.88,
            document="Python Developer",
            metadata={"title": "Python Developer Intern", "company": "Google", "source": "mock"},
            job=InternshipJob(
                title="Python Developer Intern",
                company="Google",
                location="Bangalore",
                stipend="₹80,000/month",
                duration="3 months",
                skills_required=["Python"],
                apply_url="https://careers.google.com",
                source="mock",
                description="Python role",
            ),
        )
    ]

    with patch("app.api.internships.get_retriever", return_value=mock_retriever):
        response = client.post(
            "/api/internships/search",
            json={"query": "Python Developer", "top_k": 3},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "Python Developer"
    assert data["count"] == 1
    assert data["results"][0]["job_id"] == "job_1"
    assert data["results"][0]["job"]["company"] == "Google"


def test_chat_with_career_assistant_endpoint(client: TestClient) -> None:
    mock_chatbot = MagicMock()
    mock_response = MagicMock()
    mock_response.query = "Find internships"
    mock_response.message = "Here are matching roles..."
    mock_response.results_count = 1
    mock_response.matched_internships = [
        {
            "id": "job_1",
            "title": "Data Science Intern",
            "company": "Amazon",
            "location": "Hyderabad",
            "stipend": "₹70,000/month",
            "duration": "6 months",
            "skills": ["Python", "SQL"],
            "apply_url": "https://amazon.jobs",
            "source": "mock",
            "relevance_score": 0.9,
        }
    ]
    mock_chatbot.answer.return_value = mock_response

    with patch("app.api.internships.get_chatbot", return_value=mock_chatbot):
        response = client.post(
            "/api/internships/chat",
            json={"query": "Find internships", "top_k": 2},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "Find internships"
    assert data["results_count"] == 1
    assert data["matched_internships"][0]["company"] == "Amazon"


def test_get_collection_stats_endpoint(client: TestClient) -> None:
    mock_retriever = MagicMock()
    mock_retriever.get_stats.return_value = {
        "total_count": 298,
        "collection_name": "internships",
        "sources": {"mock": 250, "apify": 48},
    }

    with patch("app.api.internships.get_retriever", return_value=mock_retriever):
        response = client.get("/api/internships/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 298
    assert data["collection_name"] == "internships"
    assert data["sources"]["mock"] == 250
    assert data["sources"]["apify"] == 48
