"""
Input validation utilities — phone, email, file upload, MongoDB query sanitization.
"""

import re
from typing import Tuple

import phonenumbers


def validate_phone(phone: str) -> str:
    """
    Validate and format a phone number to E.164 format.
    Raises ValueError if invalid.
    """
    if not phone:
        raise ValueError("Phone number is required")
    try:
        parsed = phonenumbers.parse(phone, "IN")  # Default region India
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError(f"Invalid phone number: {phone}")
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException as e:
        raise ValueError(f"Could not parse phone number: {phone}. {str(e)}")


def validate_email_format(email: str) -> str:
    """
    Validate email format using regex. Returns lowercase stripped email.
    Raises ValueError if invalid.
    """
    if not email:
        raise ValueError("Email is required")
    email = email.strip().lower()
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(pattern, email):
        raise ValueError(f"Invalid email format: {email}")
    return email


# Allowed MIME types for file uploads
ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/csv": ".csv",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def validate_file_upload(content_type: str, size: int) -> Tuple[bool, str]:
    """
    Validate a file upload by MIME type and size.
    Returns (is_valid, error_message).
    """
    if content_type not in ALLOWED_MIME_TYPES:
        allowed = ", ".join(ALLOWED_MIME_TYPES.values())
        return False, f"File type '{content_type}' is not allowed. Allowed types: {allowed}"
    if size > MAX_FILE_SIZE:
        return False, f"File size ({size / (1024*1024):.1f} MB) exceeds maximum allowed size (10 MB)"
    return True, ""


def sanitize_mongo_query(query: dict) -> dict:
    """
    Strip MongoDB operators (keys starting with $) from user-provided query dicts
    to prevent injection attacks.
    """
    if not isinstance(query, dict):
        return {}
    sanitized = {}
    for key, value in query.items():
        if isinstance(key, str) and key.startswith("$"):
            continue  # Skip MongoDB operators
        if isinstance(value, dict):
            sanitized[key] = sanitize_mongo_query(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_mongo_query(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            sanitized[key] = value
    return sanitized
