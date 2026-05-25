"""
AI-Setu CRM - Application Configuration
Loads all environment variables via pydantic-settings.
"""

from pydantic import field_validator, model_validator
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
    JWT_ISSUER: str = "ai-setu-crm-api"
    JWT_AUDIENCE: str = "ai-setu-crm-clients"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = f"http://localhost:{BACKEND_PORT}/api/v1/auth/google/callback"

    # Claude AI
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-opus-4-20250514"

    # Groq AI
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

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
    TRUSTED_PROXY_IPS: str = ""

    # Abuse protection and payload limits
    GLOBAL_RATE_LIMIT_REQUESTS: int = 300
    GLOBAL_RATE_LIMIT_WINDOW_SECONDS: int = 60
    AUTH_RATE_LIMIT_REQUESTS: int = 10
    MAX_REQUEST_BODY_BYTES: int = 10 * 1024 * 1024
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024
    MAX_PAGE_SIZE: int = 100

    # Upload allow-list. SVG/HTML are intentionally excluded.
    ALLOWED_UPLOAD_EXTENSIONS: str = "pdf,png,jpg,jpeg,webp,txt,csv,doc,docx,xls,xlsx"
    ALLOWED_UPLOAD_MIME_TYPES: str = (
        "application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv,"
        "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,"
        "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        weak_values = {
            "CHANGE-THIS-TO-A-256-BIT-RANDOM-SECRET-KEY-IN-PRODUCTION",
            "dev-jwt-secret-change-in-production",
            "dev-secret-key-change-in-production-123456",
        }
        if not value or len(value) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        if value in weak_values:
            app_env = os.getenv("APP_ENV", "development").lower()
            if app_env == "production":
                raise ValueError("JWT_SECRET_KEY must be rotated before production")
        return value

    @field_validator("JWT_ALGORITHM")
    @classmethod
    def validate_jwt_algorithm(cls, value: str) -> str:
        if value not in {"HS256", "HS384", "HS512"}:
            raise ValueError("Only explicit HMAC JWT algorithms are supported")
        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.is_production:
            origins = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
            if "*" in origins or any(origin.startswith("http://") for origin in origins):
                raise ValueError("Production ALLOWED_ORIGINS must be explicit HTTPS origins")
            if self.ACCESS_TOKEN_EXPIRE_MINUTES > 60:
                raise ValueError("Production access tokens must expire within 60 minutes")
        return self


settings = Settings()
