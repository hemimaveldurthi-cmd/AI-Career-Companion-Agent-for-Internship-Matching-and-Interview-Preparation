"""Conversational Career Assistant & Internship RAG Chatbot."""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass, field
from typing import Any

import httpx

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from app.rag.config import RAGConfig
from app.rag.retriever import InternshipRetriever
from app.schemas.rag import SearchResult

DEFAULT_LLM_MODEL = os.getenv("LLM_MODEL", "llama3.2")


@dataclass
class ChatResponse:
    """Structured response from the career assistant chatbot."""

    query: str
    message: str
    results_count: int
    matched_internships: list[dict[str, Any]] = field(default_factory=list)


class InternshipChatbot:
    """Conversational RAG assistant for internship search and matching."""

    def __init__(
        self,
        retriever: InternshipRetriever | None = None,
        config: RAGConfig | None = None,
        llm_model: str | None = None,
    ) -> None:
        self.config = config or RAGConfig()
        self.retriever = retriever or InternshipRetriever(config=self.config)
        self.llm_model = llm_model or os.getenv("LLM_MODEL", DEFAULT_LLM_MODEL)

    def answer(
        self,
        query: str,
        top_k: int = 5,
        filters: dict[str, Any] | None = None,
    ) -> ChatResponse:
        """Process a user query, retrieve relevant internships, and format an answer."""
        query = query.strip()
        if not query:
            return ChatResponse(
                query="",
                message="Please ask a question about internships (e.g., 'Find Python internships', 'Show remote ML roles').",
                results_count=0,
                matched_internships=[],
            )

        # Retrieve matching internships
        search_results: list[SearchResult] = self.retriever.search(
            query=query,
            top_k=top_k,
            filters=filters,
        )

        matched_data: list[dict[str, Any]] = []
        for result in search_results:
            job = result.job
            if job:
                matched_data.append({
                    "id": result.job_id,
                    "title": job.title,
                    "company": job.company,
                    "location": job.location,
                    "stipend": job.stipend or "Not specified",
                    "duration": job.duration or "Not specified",
                    "skills": job.skills_required,
                    "apply_url": job.apply_url,
                    "source": job.source,
                    "relevance_score": result.score,
                })

        # Try LLM generation if available, otherwise synthesize cleanly
        message = self._synthesize_response(query, matched_data)

        return ChatResponse(
            query=query,
            message=message,
            results_count=len(matched_data),
            matched_internships=matched_data,
        )

    def _synthesize_response(
        self, query: str, jobs: list[dict[str, Any]]
    ) -> str:
        """Synthesize a structured conversational answer."""
        if not jobs:
            return f"I couldn't find any internships matching '{query}'. Try broadening your search or exploring different skills/locations."

        # Attempt to use local Ollama LLM for conversational synthesis if available
        llm_answer = self._try_llm_generation(query, jobs)
        if llm_answer:
            return llm_answer

        # Structured template synthesis fallback
        lines: list[str] = [
            f"Here are the top {len(jobs)} internship opportunities matching your query: **{query}**\n"
        ]

        for idx, job in enumerate(jobs, 1):
            skills_str = ", ".join(job["skills"]) if job["skills"] else "Not specified"
            source_tag = f"[{job['source'].upper()}]" if job["source"] else ""
            lines.append(
                f"{idx}. **{job['title']}** at **{job['company']}** {source_tag}\n"
                f"   - **Location:** {job['location']}\n"
                f"   - **Stipend:** {job['stipend']}\n"
                f"   - **Duration:** {job['duration']}\n"
                f"   - **Required Skills:** {skills_str}\n"
                f"   - **Apply Link:** {job['apply_url'] if job['apply_url'] else 'N/A'}\n"
                f"   - **Relevance:** {int(job['relevance_score'] * 100)}%\n"
            )

        return "\n".join(lines).strip()

    def _try_llm_generation(
        self, query: str, jobs: list[dict[str, Any]]
    ) -> str | None:
        """Attempt to query Ollama LLM endpoint if configured and running."""
        try:
            context_blocks = []
            for j in jobs:
                skills = ", ".join(j["skills"])
                context_blocks.append(
                    f"Title: {j['title']}\nCompany: {j['company']}\nLocation: {j['location']}\n"
                    f"Stipend: {j['stipend']}\nDuration: {j['duration']}\nSkills: {skills}\n"
                    f"URL: {j['apply_url']}\nSource: {j['source']}"
                )
            context_text = "\n---\n".join(context_blocks)

            prompt = (
                "You are an AI Career Assistant. Answer the user query using the retrieved internship listings below.\n"
                "List the matching roles with their company, location, stipend, duration, key skills, and application URL.\n\n"
                f"Retrieved Internships:\n{context_text}\n\n"
                f"User Query: {query}\n\n"
                "Assistant Response:"
            )

            response = httpx.post(
                f"{self.config.ollama_base_url.rstrip('/')}/api/generate",
                json={
                    "model": self.llm_model,
                    "prompt": prompt,
                    "stream": False,
                },
                timeout=5.0,
            )
            if response.status_code == 200:
                result = response.json().get("response", "").strip()
                if result:
                    return result
        except Exception:
            pass  # Fall back to structured synthesis gracefully
        return None


def main() -> None:
    """CLI entry point for testing the chatbot interactively."""
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    parser = argparse.ArgumentParser(description="AI Internship Career Assistant Chatbot")
    parser.add_argument("query", nargs="?", type=str, help="Search query or question")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to retrieve")
    args = parser.parse_args()

    chatbot = InternshipChatbot()

    if args.query:
        response = chatbot.answer(args.query, top_k=args.top_k)
        print(f"\nQuery: {response.query}\n")
        print(response.message)
        return

    print("=========================================================")
    print(" AI Internship Career Assistant (Apify + Mock Dataset)  ")
    print(" Type your query (e.g. 'Python internships', 'Remote ML roles')")
    print(" Type 'exit' or 'quit' to end.")
    print("=========================================================\n")

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if not user_input or user_input.lower() in ("exit", "quit", "q"):
                print("Goodbye!")
                break
            response = chatbot.answer(user_input, top_k=args.top_k)
            print(f"\nAssistant:\n{response.message}")
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break


if __name__ == "__main__":
    main()
