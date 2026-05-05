"""
01 Capital Backend — FastAPI entry point.

Sprint 0 scope: auth scaffold + health endpoint + DB connection only.
No domain features until discovery validates the direction.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.database import engine

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("01capital")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info(
        "01 Capital API starting | env=%s | debug=%s",
        settings.environment,
        settings.debug,
    )
    yield
    await engine.dispose()
    logger.info("01 Capital API shutdown complete")


app = FastAPI(
    title="01 Capital API",
    description=(
        "Cap table and equity management for Saudi startups. "
        "Built natively around the 2023 Saudi Companies Law."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "01capital-backend",
        "environment": settings.environment,
        "version": "0.1.0",
    }
