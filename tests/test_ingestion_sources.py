from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.scraper.apify_scraper import ApifyScraper, normalize_apify_record


def test_apify_record_normalization_matches_real_internshala_schema() -> None:
    payload = {
        "recordType": "internship",
        "title": "Client Success",
        "company": "Internshala",
        "locations": ["Gurgaon"],
        "workMode": "onsite",
        "stipend": {
            "min": 18000,
            "max": 18000,
            "currency": "INR",
            "period": "month",
            "raw": "₹ 18,000 /month",
        },
        "salary": None,
        "durationMonths": 6,
        "postedAt": "3 days ago",
        "url": "https://internshala.com/internship/detail/abc123",
    }

    normalized = normalize_apify_record(payload)

    assert normalized["title"] == "Client Success"
    assert normalized["company"] == "Internshala"
    assert normalized["location"] == "Gurgaon"
    assert normalized["apply_url"] == "https://internshala.com/internship/detail/abc123"
    assert normalized["stipend"] == "₹ 18,000 /month"
    assert normalized["duration"] == "6 months"
    assert normalized["job_type"] == "internship"
    assert normalized["skills_required"] == []
    assert "Work mode: onsite." in normalized["description"]


def test_apify_record_normalization_supports_flexible_description_and_skills() -> None:
    payload = {
        "recordType": "internship",
        "company": "Example Labs",
        "locations": ["Bengaluru", "Remote"],
        "title": "Data Analyst Intern",
        "description": "Analyze customer behavior and ship dashboards.",
        "skills": ["SQL", "Python", "Tableau"],
        "stipend": {"min": 15000, "max": 20000, "currency": "INR", "period": "month"},
        "duration": "3 months",
        "url": "https://example.com/job/2",
    }

    normalized = normalize_apify_record(payload)

    assert normalized["location"] == "Bengaluru, Remote"
    assert normalized["skills_required"] == ["SQL", "Python", "Tableau"]
    assert normalized["description"] == "Analyze customer behavior and ship dashboards."
    assert normalized["stipend"] == "₹ 15,000 - ₹ 20,000 /month"
    assert normalized["duration"] == "3 months"


def test_apify_scraper_requires_api_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("APIFY_API_TOKEN", raising=False)
    monkeypatch.delenv("APIFY_DATASET_ID", raising=False)

    with pytest.raises(ValueError, match="APIFY_API_TOKEN"):
        ApifyScraper().scraper()


def test_apify_scraper_fetches_and_normalizes_dataset() -> None:
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.json.return_value = [
        {
            "recordType": "internship",
            "title": "Product Intern",
            "company": "Northwind",
            "locations": ["Bangalore"],
            "workMode": "remote",
            "stipend": {"min": 25000, "max": 25000, "currency": "INR", "period": "month", "raw": "₹ 25,000 /month"},
            "durationMonths": 3,
            "url": "https://example.com/jobs/3",
        }
    ]

    with patch.dict("os.environ", {"APIFY_API_TOKEN": "secret-token", "APIFY_DATASET_ID": "dataset-123"}):
        with patch("app.scraper.apify_scraper.httpx.get", return_value=response):
            jobs = ApifyScraper().scraper()

    assert len(jobs) == 1
    assert jobs[0]["company"] == "Northwind"
    assert jobs[0]["location"] == "Bangalore"
    assert jobs[0]["stipend"] == "₹ 25,000 /month"
    assert jobs[0]["duration"] == "3 months"
    assert jobs[0]["source"] == "apify"
