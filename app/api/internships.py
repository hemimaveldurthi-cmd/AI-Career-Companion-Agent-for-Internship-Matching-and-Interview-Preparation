"""FastAPI endpoints for internship RAG search, chat, and collection management."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.rag.chatbot import InternshipChatbot
from app.rag.config import RAGConfig
from app.rag.ingestion import ingest_internships
from app.rag.retriever import InternshipRetriever
from app.schemas.rag import (
    ChatRequest,
    ChatResponseSchema,
    CollectionStatsResponse,
    IngestRequest,
    IngestResponse,
    MatchedInternship,
    SearchRequest,
    SearchResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/internships", tags=["Internships"])


def get_retriever() -> InternshipRetriever:
    return InternshipRetriever()


def get_chatbot() -> InternshipChatbot:
    return InternshipChatbot()


@router.post(
    "/search",
    response_model=SearchResponse,
    summary="Semantic search for internships",
)
async def search_internships(payload: SearchRequest) -> SearchResponse:
    """Search for relevant internships using vector similarity and optional filters."""
    try:
        retriever = get_retriever()

        # Build query string if skills/location/company are specified
        query = payload.query
        filters: dict[str, Any] = payload.filters or {}

        if payload.source:
            filters["source"] = payload.source
        if payload.company:
            filters["company"] = payload.company
        if payload.location:
            filters["location"] = payload.location

        if payload.skills:
            results = retriever.search_by_skills(
                skills=payload.skills,
                top_k=payload.top_k,
                filters=filters or None,
            )
        else:
            results = retriever.search(
                query=query,
                top_k=payload.top_k,
                filters=filters or None,
            )

        return SearchResponse(
            query=query,
            count=len(results),
            results=results,
        )
    except Exception as exc:
        logger.error("Internship search failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internship search failed: {str(exc)}",
        ) from exc


@router.post(
    "/chat",
    response_model=ChatResponseSchema,
    summary="Conversational AI Career Assistant",
)
async def chat_with_career_assistant(payload: ChatRequest) -> ChatResponseSchema:
    """Ask natural language questions about internship listings."""
    try:
        chatbot = get_chatbot()
        filters = {"source": payload.source} if payload.source else None
        response = chatbot.answer(
            query=payload.query,
            top_k=payload.top_k,
            filters=filters,
        )

        matched = [
            MatchedInternship(
                id=item["id"],
                title=item["title"],
                company=item["company"],
                location=item["location"],
                stipend=item["stipend"],
                duration=item["duration"],
                skills=item["skills"],
                apply_url=item["apply_url"],
                source=item["source"],
                relevance_score=item["relevance_score"],
            )
            for item in response.matched_internships
        ]

        return ChatResponseSchema(
            query=response.query,
            message=response.message,
            results_count=response.results_count,
            matched_internships=matched,
        )
    except Exception as exc:
        logger.error("Career assistant chat failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Career assistant chat failed: {str(exc)}",
        ) from exc


@router.get(
    "/stats",
    response_model=CollectionStatsResponse,
    summary="Get collection statistics",
)
async def get_stats() -> CollectionStatsResponse:
    """Return total count and per-source breakdown of indexed internships."""
    try:
        retriever = get_retriever()
        stats = retriever.get_stats()
        return CollectionStatsResponse(
            total_count=stats.get("total_count", 0),
            collection_name=stats.get("collection_name", "internships"),
            sources=stats.get("sources", {}),
        )
    except Exception as exc:
        logger.error("Failed to retrieve collection stats: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve stats: {str(exc)}",
        ) from exc


@router.post(
    "/ingest",
    response_model=IngestResponse,
    summary="Trigger internship data ingestion",
)
async def trigger_ingestion(payload: IngestRequest) -> IngestResponse:
    """Trigger the unified ingestion pipeline for mock and/or Apify datasets."""
    try:
        config = RAGConfig()
        indexed = ingest_internships(
            reset=payload.reset,
            source=payload.source,
            config=config,
        )
        return IngestResponse(
            status="success",
            indexed_count=indexed,
            source=payload.source,
            collection_name=config.collection_name,
        )
    except Exception as exc:
        logger.error("Ingestion failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(exc)}",
        ) from exc
