"""
General helper utilities — request IDs, pagination, masking, token generation.
"""

import math
import re
import secrets
from uuid import uuid4
from datetime import datetime, timezone
from typing import Tuple, List


def generate_request_id() -> str:
    """Generate a UUID4 request ID."""
    return str(uuid4())


def utc_now() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


def paginate_params(page: int = 1, per_page: int = 20) -> Tuple[int, int]:
    """
    Convert page/per_page to skip/limit for MongoDB queries.
    Returns (skip, limit).
    """
    page = max(1, page)
    from config import settings

    per_page = max(1, min(settings.MAX_PAGE_SIZE, per_page))
    skip = (page - 1) * per_page
    return skip, per_page


def build_paginated_response(items: list, total: int, page: int, per_page: int) -> dict:
    """Build a standardized paginated response dict."""
    return {
        "data": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


def build_sort_params(sort_by: str = "created_at", sort_order: str = "desc") -> List:
    """
    Build a pymongo-compatible sort list from sort_by and sort_order strings.
    Returns [(field, direction)] list.
    """
    direction = -1 if sort_order.lower() == "desc" else 1
    # Whitelist allowed sort fields to prevent injection
    allowed_fields = {
        "created_at", "updated_at", "name", "first_name", "last_name",
        "email", "status", "score", "value", "due_date", "priority",
        "stage", "total", "invoice_number", "title", "company",
    }
    if sort_by not in allowed_fields:
        sort_by = "created_at"
    return [(sort_by, direction)]


def escape_regex(value: str, max_length: int = 100) -> str:
    """Escape user input before placing it in a Mongo regex query."""
    cleaned = (value or "").strip()[:max_length]
    return re.escape(cleaned)


def parse_object_id(value: str, field_name: str = "id"):
    """Parse a Mongo ObjectId and return a client-safe 400 on malformed IDs."""
    from beanie import PydanticObjectId
    from fastapi import HTTPException, status

    try:
        return PydanticObjectId(value)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )


def mask_email(email: str) -> str:
    """Mask an email address for logging: 'john@gmail.com' -> 'j***@gmail.com'."""
    if not email or "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        return f"*@{domain}"
    return f"{local[0]}***@{domain}"


def mask_phone(phone: str) -> str:
    """Mask a phone number for logging: '+919876543210' -> '****3210'."""
    if not phone:
        return "****"
    return f"****{phone[-4:]}" if len(phone) >= 4 else "****"


def generate_invite_token() -> str:
    """Generate a secure URL-safe invite token."""
    return secrets.token_urlsafe(32)


def generate_invoice_number(year: int, sequence: int) -> str:
    """Generate an invoice number in format INV-YYYY-XXXX."""
    return f"INV-{year}-{sequence:04d}"
