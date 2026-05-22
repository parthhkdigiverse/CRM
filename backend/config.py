"""
AI-Setu CRM - Application Configuration
Loads all environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


import os
from dotenv import load_dotenv

# Load root .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

FRONTEND_PORT = os.getenv("FRONTEND_PORT", "5173")
BACKEND_PORT = os.getenv("BACKEND_PORT", "8000")

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017/ai_setu_crm"
    MONGODB_DB_NAME: str = "ai_setu_crm"

    # JWT
    JWT_SECRET_KEY: str = "CHANGE-THIS-TO-A-256-BIT-RANDOM-SECRET-KEY-IN-PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours for development
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = f"http://localhost:{BACKEND_PORT}/api/v1/auth/google/callback"

    # Claude AI
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-opus-4-20250514"

    # Email (Resend)
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@ai-setu.com"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # App
    APP_ENV: str = "development"
    FRONTEND_URL: str = f"http://localhost:{FRONTEND_PORT}"
    BACKEND_URL: str = f"http://localhost:{BACKEND_PORT}"
    ALLOWED_ORIGINS: str = f"http://localhost:{FRONTEND_PORT},http://127.0.0.1:{FRONTEND_PORT},http://localhost:3000,http://127.0.0.1:3000"


settings = Settings()
