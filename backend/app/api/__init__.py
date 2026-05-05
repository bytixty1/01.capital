from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.companies import router as companies_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(companies_router)
