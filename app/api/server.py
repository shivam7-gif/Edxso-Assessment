"""Main FastAPI server application for CreatorFlow AI."""

import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.api.routes import router
from app.database.database import init_db
from app.config.settings import get_settings

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database is ready on startup
    init_db()
    yield

app = FastAPI(
    title="CreatorFlow AI Backend API",
    description="REST API for automated micro-influencer discovery, brand-fit scoring, Groq personalization, and CRM outreach.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local Next.js frontend (localhost:3000) and arbitrary development clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api.server:app", host="0.0.0.0", port=8000, reload=True)
