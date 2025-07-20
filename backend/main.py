from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import os
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, create_tables
from app.routers import auth, receipts, inventory, marketplace, users
from app.models import Base

security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🚀 Starting ShelfLife.AI API...")
    await create_tables()
    print("✅ Database tables created")
    yield
    # Shutdown
    print("🛑 Shutting down ShelfLife.AI API...")

app = FastAPI(
    title="ShelfLife.AI API",
    description="AI-powered food expiry tracking and waste reduction platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ShelfLife.AI API",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to ShelfLife.AI API 🥗",
        "description": "AI-powered food expiry tracking and waste reduction",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0"
    }

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(receipts.router, prefix="/api/receipts", tags=["receipts"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["marketplace"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=settings.DEBUG,
        log_level="info"
    )
