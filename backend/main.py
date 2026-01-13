from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config import settings
from app.database import init_db
from app.routers import leads, chat, auth
import os

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

# Mount outputs directory for file downloads
if os.path.exists(settings.OUTPUT_DIR):
    app.mount("/outputs", StaticFiles(directory=settings.OUTPUT_DIR), name="outputs")


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()
    print(f"✓ {settings.APP_NAME} started successfully")
    print(f"✓ Database initialized")
    print(f"✓ Output directory: {settings.OUTPUT_DIR}")
    
    # Initialize RAG Service (Lazy Load)
    from app.services.rag_service import rag_service
    rag_service.initialize()


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print(f"✓ {settings.APP_NAME} shutting down")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
