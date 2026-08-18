"""API routers package."""

from app.api.auth import router as auth_router
from app.api.internships import router as internships_router

__all__ = ["auth_router", "internships_router"]
