"""
Cloudinary service — file upload/delete with MIME type and size validation.
Gracefully handles missing Cloudinary credentials.
"""

import logging

from config import settings
from utils.validators import validate_file_upload

logger = logging.getLogger(__name__)


def _configure_cloudinary() -> bool:
    """Configure Cloudinary SDK. Returns True if configured."""
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY:
        logger.warning("Cloudinary is not configured — file operations will be skipped")
        return False
    try:
        import cloudinary
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to configure Cloudinary: {e}")
        return False


async def upload_file(file_bytes: bytes, folder: str, filename: str, content_type: str = "") -> str:
    """
    Upload a file to Cloudinary.
    Returns the secure URL of the uploaded file.
    Raises ValueError if validation fails or upload errors.
    """
    # Validate file
    is_valid, error_msg = validate_file_upload(content_type, len(file_bytes))
    if not is_valid:
        raise ValueError(error_msg)

    if not _configure_cloudinary():
        raise ValueError("File storage is not configured")

    try:
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            public_id=filename,
            resource_type="auto",
            overwrite=True,
        )
        return result.get("secure_url", "")
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise ValueError(f"File upload failed: {str(e)}")


async def delete_file(public_id: str) -> None:
    """Delete a file from Cloudinary by its public ID."""
    if not _configure_cloudinary():
        return

    try:
        import cloudinary.uploader
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}")
