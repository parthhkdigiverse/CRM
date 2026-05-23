"""
Authentication request/response schemas.
"""

from typing import Optional, Dict

from pydantic import BaseModel, EmailStr, Field, field_validator


def _strip_text(value: Optional[str]) -> Optional[str]:
    return value.strip() if isinstance(value, str) else value


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_names(cls, value: str) -> str:
        return value.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    remember_me: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=4096)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(pattern=r"^\d{6}$")


class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=80)
    last_name: Optional[str] = Field(default=None, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=32)
    timezone: Optional[str] = Field(default=None, max_length=64)

    @field_validator("first_name", "last_name", "phone", "timezone")
    @classmethod
    def strip_optional_text(cls, value: Optional[str]) -> Optional[str]:
        return _strip_text(value)
