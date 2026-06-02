"""
Per-organization Meta (Facebook / Instagram) Lead Ads integration settings.

Each organization stores its own Meta credentials. Secrets (access token, app
secret) are encrypted at rest via utils.crypto. Non-secret config (ad account id,
form ids, etc.) is stored as plaintext.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class MetaIntegration(Document):
    """One Meta integration config per organization."""

    org_id: PydanticObjectId

    # Encrypted secrets (never returned raw to the client)
    access_token_enc: Optional[str] = None
    app_secret_enc: Optional[str] = None

    # Non-secret config
    ad_account_id: Optional[str] = None          # act_XXXX or XXXX
    lead_form_ids: Optional[str] = None           # comma separated
    webhook_verify_token: Optional[str] = None    # used in webhook handshake
    graph_version: str = "v19.0"

    # Behaviour
    enabled: bool = True                          # master switch for this org
    auto_sync_enabled: bool = True
    sync_interval_minutes: int = 15

    # Status tracking
    last_synced_at: Optional[datetime] = None
    last_error: Optional[str] = None
    last_sync_created: int = 0

    # Base fields
    created_by: Optional[PydanticObjectId] = None
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False

    class Settings:
        name = "meta_integrations"
        indexes = [
            "org_id",
            "webhook_verify_token",
        ]
