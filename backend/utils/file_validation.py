"""
Strict upload validation for user-controlled files.
"""

import os
import re
from dataclasses import dataclass
from typing import BinaryIO

from fastapi import HTTPException, UploadFile, status

from config import settings

try:
    import magic  # type: ignore
except Exception:  # pragma: no cover - optional native dependency
    magic = None


FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


@dataclass(frozen=True)
class ValidatedUpload:
    filename: str
    extension: str
    mime_type: str
    size_bytes: int


def sanitize_filename(filename: str) -> str:
    """Remove path segments and unsafe filename characters."""
    base = os.path.basename(filename or "upload")
    base = FILENAME_RE.sub("_", base).strip("._")
    return base[:120] or "upload"


def _allowed_extensions() -> set[str]:
    return {item.strip().lower() for item in settings.ALLOWED_UPLOAD_EXTENSIONS.split(",") if item.strip()}


def _allowed_mimes() -> set[str]:
    return {item.strip().lower() for item in settings.ALLOWED_UPLOAD_MIME_TYPES.split(",") if item.strip()}


def detect_mime(sample: bytes, declared: str | None) -> str:
    """Prefer magic-byte detection and fall back to client MIME only when needed."""
    if magic:
        detected = magic.from_buffer(sample, mime=True)
        if detected:
            return detected.lower()
    return (declared or "application/octet-stream").lower()


async def validate_upload(file: UploadFile, *, allow_images_only: bool = False) -> ValidatedUpload:
    """Validate name, extension, MIME, magic bytes, and max upload size."""
    filename = sanitize_filename(file.filename or "upload")
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    allowed_extensions = {"png", "jpg", "jpeg", "webp"} if allow_images_only else _allowed_extensions()

    if extension not in allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File type is not allowed")

    sample = await file.read(4096)
    await file.seek(0)
    mime_type = detect_mime(sample, file.content_type)
    allowed_mimes = {"image/png", "image/jpeg", "image/webp"} if allow_images_only else _allowed_mimes()

    if mime_type not in allowed_mimes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File content type is not allowed")

    size = await _measure_size(file.file)
    await file.seek(0)
    if size <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if size > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Uploaded file is too large")

    return ValidatedUpload(filename=filename, extension=extension, mime_type=mime_type, size_bytes=size)


async def _measure_size(file_obj: BinaryIO) -> int:
    """Measure UploadFile size without loading it into memory."""
    file_obj.seek(0, os.SEEK_END)
    size = file_obj.tell()
    file_obj.seek(0)
    return size
