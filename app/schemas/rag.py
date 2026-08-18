"""Pydantic schemas for the internship RAG pipeline."""

from __future__ import annotations

import hashlib
import re
from typing import Any

from pydantic import BaseModel, Field, field_validator


class InternshipJob(BaseModel):
    """Structured internship record from the scraper."""

    title: str
    company: str
    description: str
    skills_required: list[str] = Field(default_factory=list)
    location: str
    apply_url: str
    source: str = "mock"
    job_type: str = "internship"
    stipend: str = ""
    duration: str = ""

    @field_validator("skills_required", mode="before")
    @classmethod
    def _normalize_skills(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [part.strip() for part in value.split(",") if part.strip()]
        return [str(skill).strip() for skill in value if str(skill).strip()]

    @property
    def document_id(self) -> str:
        """Return a stable vector-store identifier."""
        payload = self.model_dump_json()
        slug = re.sub(
            r"[^a-z0-9]+",
            "_",
            f"{self.company}_{self.title}".lower(),
        ).strip("_")[:50]
        digest = hashlib.sha256(payload.encode()).hexdigest()[:12]
        return f"{slug}_{digest}"

    def to_document_text(self) -> str:
        """Flatten the job into embedding-friendly text."""
        skills = ", ".join(self.skills_required)
        return (
            f"Title: {self.title}\n"
            f"Company: {self.company}\n"
            f"Location: {self.location}\n"
            f"Job Type: {self.job_type}\n"
            f"Stipend: {self.stipend}\n"
            f"Duration: {self.duration}\n"
            f"Skills: {skills}\n"
            f"Description: {self.description}"
        )

    def to_metadata(self) -> dict[str, str]:
        """Return flat metadata compatible with ChromaDB."""
        return {
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "description": self.description,
            "apply_url": self.apply_url,
            "source": self.source,
            "job_type": self.job_type,
            "stipend": self.stipend,
            "duration": self.duration,
            "skills": ", ".join(self.skills_required),
        }


class SearchResult(BaseModel):
    """Single retrieval result from the vector store."""

    job_id: str
    score: float
    document: str
    metadata: dict[str, str]
    job: InternshipJob | None = None


class SearchRequest(BaseModel):
    """Request payload for semantic internship search."""

    query: str
    top_k: int = Field(default=5, ge=1, le=50)
    filters: dict[str, Any] | None = None
    skills: list[str] | None = None
    location: str | None = None
    company: str | None = None
    source: str | None = None


class SearchResponse(BaseModel):
    """Response payload containing matching internship search results."""

    query: str
    count: int
    results: list[SearchResult]


class ChatRequest(BaseModel):
    """Request payload for conversational internship career assistant."""

    query: str
    top_k: int = Field(default=5, ge=1, le=20)
    source: str | None = None


class MatchedInternship(BaseModel):
    """Structured internship summary returned by the chatbot."""

    id: str
    title: str
    company: str
    location: str
    stipend: str
    duration: str
    skills: list[str]
    apply_url: str
    source: str
    relevance_score: float


class ChatResponseSchema(BaseModel):
    """Conversational answer response payload."""

    query: str
    message: str
    results_count: int
    matched_internships: list[MatchedInternship] = Field(default_factory=list)


class IngestRequest(BaseModel):
    """Request payload to trigger data ingestion."""

    reset: bool = False
    source: str = "all"  # "all", "mock", "apify"


class IngestResponse(BaseModel):
    """Response payload from ingestion pipeline."""

    status: str
    indexed_count: int
    source: str
    collection_name: str


class CollectionStatsResponse(BaseModel):
    """Response payload for collection status."""

    total_count: int
    collection_name: str
    sources: dict[str, int]
