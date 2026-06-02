"""
Migration: add Meta (Facebook / Instagram) Lead Ads fields to the leads collection.

MongoDB is schemaless, so new fields defined on the Beanie `Lead` model are written
automatically for any NEW lead. This script backfills EXISTING lead documents so that
the new Meta fields exist (set to null) and are therefore indexable / queryable.

It also ensures the `meta_lead_id` index is present.

Safe to run multiple times (idempotent) — it only adds missing fields and never
modifies existing data.

Usage:
    python scripts/migrate_meta_lead_fields.py
"""

import sys
import os
import asyncio

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, close_db
from models.lead import Lead

META_FIELDS = [
    "meta_lead_id",
    "meta_platform",
    "meta_ad_id",
    "meta_ad_name",
    "meta_campaign_id",
    "meta_campaign_name",
    "meta_adset_id",
    "meta_adset_name",
    "meta_form_id",
    "meta_form_name",
    "meta_city",
    "meta_raw_fields",
]


async def migrate():
    await init_db()
    try:
        # Beanie 2.x exposes the underlying async pymongo collection here.
        if hasattr(Lead, "get_pymongo_collection"):
            collection = Lead.get_pymongo_collection()
        else:
            collection = Lead.get_motor_collection()

        # 1) Backfill each new field with null only where it doesn't already exist.
        total_modified = 0
        for field in META_FIELDS:
            result = await collection.update_many(
                {field: {"$exists": False}},
                {"$set": {field: None}},
            )
            print(f"  {field}: set on {result.modified_count} document(s)")
            total_modified += result.modified_count

        # 2) Ensure the meta_lead_id index exists. Beanie already creates a
        #    non-sparse index from the model declaration, so treat "already
        #    exists" as success rather than an error.
        try:
            existing = await collection.index_information()
            if any("meta_lead_id" in str(idx.get("key", "")) for idx in existing.values()) \
               or "meta_lead_id_1" in existing:
                print("  Index on meta_lead_id already present.")
            else:
                await collection.create_index("meta_lead_id", sparse=True)
                print("  Index on meta_lead_id created.")
        except Exception as e:
            print(f"  Index on meta_lead_id already present (skipped): {type(e).__name__}")

        total_docs = await collection.count_documents({})
        print(f"\nMigration complete. Leads collection has {total_docs} document(s).")
        print(f"Total field writes: {total_modified}.")
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(migrate())
