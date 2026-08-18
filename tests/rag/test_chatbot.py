"""Unit tests for the conversational RAG chatbot assistant."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.rag.chatbot import InternshipChatbot
from app.schemas.rag import InternshipJob, SearchResult


@pytest.fixture
def mock_retriever() -> MagicMock:
    retriever = MagicMock()
    retriever.search.return_value = [
        SearchResult(
            job_id="job_py_1",
            score=0.85,
            document="Python Developer at Google",
            metadata={"title": "Python Developer Intern", "company": "Google", "source": "mock"},
            job=InternshipJob(
                title="Python Developer Intern",
                company="Google",
                location="Bangalore, India",
                stipend="₹80,000/month",
                duration="3 months",
                skills_required=["Python", "Django", "SQL"],
                apply_url="https://careers.google.com",
                source="mock",
                description="Backend engineer working with Python services.",
            ),
        ),
        SearchResult(
            job_id="job_apify_1",
            score=0.78,
            document="Client Success at Internshala",
            metadata={"title": "Client Success", "company": "Internshala", "source": "apify"},
            job=InternshipJob(
                title="Client Success",
                company="Internshala",
                location="Gurgaon",
                stipend="₹ 18,000 /month",
                duration="6 months",
                skills_required=["Client Interaction", "Communication"],
                apply_url="https://internshala.com/internship/123",
                source="apify",
                description="Handle client relationships and communication.",
            ),
        ),
    ]
    return retriever


def test_chatbot_answers_query_with_structured_template(mock_retriever: MagicMock) -> None:
    chatbot = InternshipChatbot(retriever=mock_retriever)
    response = chatbot.answer("Find internships")

    assert response.query == "Find internships"
    assert response.results_count == 2
    assert len(response.matched_internships) == 2

    # Check both mock and apify entries are represented in output
    assert "Python Developer Intern" in response.message
    assert "Google" in response.message
    assert "[MOCK]" in response.message
    assert "Client Success" in response.message
    assert "Internshala" in response.message
    assert "[APIFY]" in response.message
    assert "https://careers.google.com" in response.message
    assert "https://internshala.com/internship/123" in response.message


def test_chatbot_handles_empty_query(mock_retriever: MagicMock) -> None:
    chatbot = InternshipChatbot(retriever=mock_retriever)
    response = chatbot.answer("")

    assert response.results_count == 0
    assert "Please ask a question" in response.message


def test_chatbot_handles_zero_search_results(mock_retriever: MagicMock) -> None:
    mock_retriever.search.return_value = []
    chatbot = InternshipChatbot(retriever=mock_retriever)
    response = chatbot.answer("Quantum astronaut internship")

    assert response.results_count == 0
    assert "couldn't find any internships" in response.message
