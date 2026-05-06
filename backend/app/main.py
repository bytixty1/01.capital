"""01 Capital Backend — FastAPI entry point."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api import api_router
from app.core.config import settings
from app.core.database import async_session_factory, engine

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("01capital")

limiter = Limiter(key_func=lambda request: request.client.host if request.client else "unknown")


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
app.add_middleware(SlowAPIMiddleware)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.include_router(api_router)


# ── Exception handlers ─────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Pydantic v2 ctx may contain raw Exception objects — convert to strings so
    # JSONResponse can serialise them without TypeError.
    errors = exc.errors()
    for err in errors:
        if "ctx" in err and isinstance(err["ctx"].get("error"), Exception):
            err["ctx"] = {"error": str(err["ctx"]["error"])}
    logger.warning("Validation error | path=%s | errors=%s", request.url.path, errors)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception | path=%s", request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health_check() -> JSONResponse:
    db_ok = True
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
        logger.warning("Health check: database unreachable")

    payload = {
        "status": "healthy" if db_ok else "degraded",
        "service": "01capital-backend",
        "environment": settings.environment,
        "version": "0.1.0",
        "database": "healthy" if db_ok else "unreachable",
    }
    code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(content=payload, status_code=code)
