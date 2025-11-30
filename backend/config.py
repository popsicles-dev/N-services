from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:hifsa@localhost:5432/seo_leads_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # ScrapingDog API
    SCRAPINGDOG_API_KEY: str = "6745f340590409176378e01e"
    
    # Google PageSpeed API
    PAGESPEED_API_KEY: str = "AIzaSyAdE5WmAS5Cew1vcHRplzj3A3iCBVZXbvQ"

    # Groq API (Chatbot)
    GROQ_API_KEY: str = "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" # User must set this in .env


    # Application
    APP_NAME: str = "SEO Lead Generation API"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
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
