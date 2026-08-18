"""Apify-backed internship source for the existing ingestion pipeline."""

from __future__ import annotations

import os
from typing import Any

import httpx

APIFY_API_TOKEN_ENV_VAR = "APIFY_API_TOKEN"
APIFY_DATASET_ID_ENV_VAR = "APIFY_DATASET_ID"
APIFY_BASE_URL_ENV_VAR = "APIFY_BASE_URL"

DEFAULT_APIFY_BASE_URL = "https://api.apify.com/v2"


def _coerce_string(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    if isinstance(value, str):
        return value.strip() or fallback
    if isinstance(value, (int, float)):
        return str(value)
    return str(value).strip() or fallback


def _extract_nested_text(value: Any, *keys: str) -> str:
    if isinstance(value, dict):
        for key in keys:
            if key in value:
                candidate = value.get(key)
                if candidate is not None:
                    return _coerce_string(candidate)
        for candidate_key in ("name", "city", "region", "country"):
            if candidate_key in value:
                text = _coerce_string(value.get(candidate_key))
                if text:
                    return text
    return _coerce_string(value)


def _format_amount(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        number = float(value)
        if number.is_integer():
            return f"{int(number):,}"
        return f"{number:,.2f}".rstrip("0").rstrip(".")
    return _coerce_string(value)


def _normalize_stipend(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        raw_value = _coerce_string(value.get("raw"))
        if raw_value:
            return raw_value

        currency = _coerce_string(value.get("currency"), "")
        period = _coerce_string(value.get("period"), "")
        minimum = value.get("min")
        maximum = value.get("max")

        if minimum is None and maximum is None:
            return ""

        if minimum is not None and maximum is not None and minimum == maximum:
            amount = _format_amount(minimum)
        elif minimum is not None and maximum is not None:
            min_amount = _format_amount(minimum)
            max_amount = _format_amount(maximum)
            if currency:
                amount = f"{currency} {min_amount} - {currency} {max_amount}"
            else:
                amount = f"{min_amount} - {max_amount}"
        else:
            amount = _format_amount(minimum if minimum is not None else maximum)

        if not amount:
            return ""

        symbol = "₹" if currency.upper() == "INR" else "$" if currency.upper() == "USD" else currency
        if symbol and symbol != currency:
            if " - " in amount:
                formatted = amount.replace(currency, symbol)
            else:
                formatted = f"{symbol} {amount}"
        else:
            formatted = f"{currency} {amount}" if currency and " - " not in amount else amount

        if period:
            return f"{formatted} /{period}"
        return formatted

    return _coerce_string(value)


def _normalize_duration(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        numeric_value = float(value)
        if numeric_value.is_integer():
            return f"{int(numeric_value)} months"
        return f"{numeric_value:g} months"
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return ""
        if text.isdigit():
            return f"{text} months"
        return text
    return _coerce_string(value)


def _normalize_location(value: Any) -> str:
    if value is None:
        return "Remote"
    if isinstance(value, str):
        return value.strip() or "Remote"
    if isinstance(value, (list, tuple, set)):
        parts: list[str] = []
        for item in value:
            if isinstance(item, dict):
                place = _extract_nested_text(item, "city", "name", "region", "country")
            else:
                place = _coerce_string(item)
            if place and place not in parts:
                parts.append(place)
        if parts:
            return ", ".join(parts)
        return "Remote"
    if isinstance(value, dict):
        location = _extract_nested_text(value, "city", "name", "region", "country", "raw")
        return location or "Remote"
    return _coerce_string(value, "Remote")


def _normalize_skills(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        parts = [segment.strip() for segment in value.split(",")]
        return [part for part in parts if part]
    if isinstance(value, (list, tuple, set)):
        flattened: list[str] = []
        for item in value:
            if isinstance(item, str):
                item_value = item.strip()
                if item_value:
                    flattened.append(item_value)
            elif isinstance(item, dict):
                candidate = _extract_nested_text(item, "name", "skill", "title")
                if candidate:
                    flattened.append(candidate)
        return flattened
    return [str(value).strip()] if str(value).strip() else []


def normalize_apify_record(raw_job: dict[str, Any]) -> dict[str, Any]:
    """Convert a raw Apify job record into the repository's internal schema."""
    company = raw_job.get("company")
    if isinstance(company, dict):
        company_name = _extract_nested_text(company, "name", "companyName")
    else:
        company_name = _coerce_string(company, "Unknown company")

    location = _normalize_location(
        raw_job.get("location")
        or raw_job.get("locations")
        or raw_job.get("locationName")
    )

    title = _coerce_string(
        raw_job.get("title") or raw_job.get("jobTitle") or raw_job.get("name"),
        "Untitled Internship",
    )
    description = _coerce_string(
        raw_job.get("description")
        or raw_job.get("descriptionText")
        or raw_job.get("text")
        or raw_job.get("summary")
        or raw_job.get("snippet"),
        "No description provided.",
    )
    work_mode = _coerce_string(raw_job.get("workMode"))
    if work_mode:
        description = (
            f"{description.rstrip('.')}.") if description and description != "No description provided." else "No description provided."
        description = f"{description} Work mode: {work_mode}." if description and "Work mode:" not in description else description

    apply_url = _coerce_string(
        raw_job.get("applyUrl")
        or raw_job.get("url")
        or raw_job.get("apply_url")
        or raw_job.get("link"),
        "",
    )
    skills_required = _normalize_skills(
        raw_job.get("skills_required")
        or raw_job.get("skillsRequired")
        or raw_job.get("skills")
        or raw_job.get("requiredSkills")
    )
    job_type = _coerce_string(
        raw_job.get("recordType")
        or raw_job.get("jobType")
        or raw_job.get("employmentType")
        or raw_job.get("type"),
        "internship",
    )
    if not job_type:
        job_type = "internship"

    duration_value = (
        raw_job.get("durationMonths")
        if raw_job.get("durationMonths") is not None
        else raw_job.get("duration")
        or raw_job.get("contractDuration")
        or raw_job.get("tenure")
    )

    return {
        "title": title,
        "company": company_name,
        "description": description,
        "skills_required": skills_required,
        "location": location,
        "apply_url": apply_url,
        "source": "apify",
        "job_type": job_type,
        "stipend": _normalize_stipend(
            raw_job.get("stipend")
            or raw_job.get("salary")
            or raw_job.get("pay")
        ),
        "duration": _normalize_duration(duration_value),
    }


class ApifyScraper:
    """Fetch internship records from an Apify dataset and normalize them."""

    def __init__(
        self,
        *,
        api_token: str | None = None,
        dataset_id: str | None = None,
        base_url: str | None = None,
    ) -> None:
        self.api_token = api_token or os.getenv(APIFY_API_TOKEN_ENV_VAR)
        self.dataset_id = dataset_id or os.getenv(APIFY_DATASET_ID_ENV_VAR)
        self.base_url = base_url or os.getenv(APIFY_BASE_URL_ENV_VAR, DEFAULT_APIFY_BASE_URL)

    def scraper(self) -> list[dict[str, Any]]:
        """Return raw internship dicts compatible with IngestionPipeline."""
        if not self.api_token:
            raise ValueError(f"{APIFY_API_TOKEN_ENV_VAR} is required to access the Apify dataset.")
        if not self.dataset_id:
            raise ValueError(f"{APIFY_DATASET_ID_ENV_VAR} is required to access the Apify dataset.")

        url = f"{self.base_url.rstrip('/')}/datasets/{self.dataset_id}/items"
        response = httpx.get(
            url,
            params={"token": self.api_token, "clean": "true"},
            timeout=30,
        )
        response.raise_for_status()

        raw_items = response.json()
        if not isinstance(raw_items, list):
            return []

        normalized_jobs: list[dict[str, Any]] = []
        for raw_job in raw_items:
            if not isinstance(raw_job, dict):
                continue
            normalized_jobs.append(normalize_apify_record(raw_job))
        return normalized_jobs
