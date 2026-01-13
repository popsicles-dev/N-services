from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/seo_leads_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # ScrapingDog API
    SCRAPINGDOG_API_KEY: Optional[str] = None
    
    # Google PageSpeed API
    PAGESPEED_API_KEY: Optional[str] = None

    # Groq API (Chatbot)
    GROQ_API_KEY: Optional[str] = None

    # JWT Authentication
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7


    # Application
    APP_NAME: str = "SEO Lead Generation API"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"]
    
    # File Storage
    OUTPUT_DIR: str = "outputs"
    
    # Request Settings
    REQUEST_TIMEOUT: int = 7
    USER_AGENT: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()

# Ensure output directory exists
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
