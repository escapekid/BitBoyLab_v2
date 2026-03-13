"""
bitboylab_boy.api.main
~~~~~~~~~~~~~~~~~~~~
FastAPI application entry point.

Run with:
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

Swagger UI:   http://localhost:8000/docs
ReDoc UI:     http://localhost:8000/redoc
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.effects import router as effects_router
from api.routes.process import router as process_router

app = FastAPI(
    title="BitBoy Lab API",
    description=(
        "Layered image-processing engine with 6 effects: "
        "ASCII, Dither, CRT, Glitch, Pixel Sort, Edge Detect. "
        "Designed for Next.js frontend integration."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

import logging
import traceback
from fastapi.responses import JSONResponse

# Setup logging to file
logging.basicConfig(
    filename="backend.log",
    level=logging.ERROR,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    err_msg = f"CRITICAL ERROR: {exc}\n{traceback.format_exc()}"
    print(err_msg)
    logging.error(err_msg)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)}
    )

@app.middleware("http")
async def log_requests(request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        err_msg = f"MIDDLEWARE ERROR: {exc}\n{traceback.format_exc()}"
        print(err_msg)
        logging.error(err_msg)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"}
        )

# Allow Next.js dev server (and any frontend) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # restrict in production: ["https://yourapp.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes under /api prefix
app.include_router(effects_router, prefix="/api", tags=["Effects"])
app.include_router(process_router, prefix="/api", tags=["Processing"])


@app.get("/", tags=["Health"])
def health_check() -> dict[str, str]:
    """Simple health-check endpoint."""
    return {"status": "ok", "service": "BitBoy Lab API"}
