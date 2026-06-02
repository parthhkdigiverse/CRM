"""
Seed sample Facebook / Instagram (Meta) leads so you can preview how Meta
leads appear in the Leads page, the source badges, the detail panel, and the
Meta Ads Summary section.

These sample leads are pushed through the SAME code path as real Meta leads
(services.meta_service.save_meta_lead), so they behave identically:
  - source = "facebook" / "instagram"
  - status = "new"
  - meta_* fields populated (ad, campaign, ad set, form, city, platform)
  - deduped by meta_lead_id (safe to run multiple times)

All sample leads use a "SAMPLE_FBIG_" meta_lead_id prefix so they are easy to
identify and remove later.

Usage:
    python scripts/seed_meta_leads.py            # insert sample leads
    python scripts/seed_meta_leads.py --remove   # delete the sample leads
"""

import sys
import os
import asyncio
from datetime import datetime, timezone, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, close_db
from models.lead import Lead
from models.organization import Organization
from models.user import User
from services import meta_service

SAMPLE_PREFIX = "SAMPLE_FBIG_"


def _ts(days_ago: float) -> str:
    """ISO timestamp `days_ago` days in the past (Meta-style created_time)."""
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


# Sample leads shaped exactly like Meta Graph API lead objects.
# Ahmedabad is intentionally the most common city, and "Summer Sale 2024" the
# most common campaign, so "Top City" / "Top Campaign" show meaningful values.
SAMPLE_LEADS = [
    {
        "id": f"{SAMPLE_PREFIX}001",
        "created_time": _ts(0.1),
        "platform": "facebook",
        "ad_id": "120210000000001",
        "ad_name": "FB - Summer Discount Carousel",
        "campaign_id": "238400000000001",
        "campaign_name": "Summer Sale 2024",
        "adset_id": "238410000000001",
        "adset_name": "Gujarat - 25-45 - Interested in Real Estate",
        "form_id": "1111111111",
        "form_name": "Summer Sale - Enquiry Form",
        "field_data": [
            {"name": "full_name", "values": ["Anita Patel"]},
            {"name": "email", "values": ["anita.patel@example.com"]},
            {"name": "phone_number", "values": ["+919876543210"]},
            {"name": "city", "values": ["Ahmedabad"]},
            {"name": "company_name", "values": ["Patel Textiles"]},
        ],
    },
    {
        "id": f"{SAMPLE_PREFIX}002",
        "created_time": _ts(0.3),
        "platform": "instagram",
        "ad_id": "120210000000002",
        "ad_name": "IG - Story Reel Promo",
        "campaign_id": "238400000000001",
        "campaign_name": "Summer Sale 2024",
        "adset_id": "238410000000002",
        "adset_name": "Metro Cities - 18-30 - Lifestyle",
        "form_id": "1111111111",
        "form_name": "Summer Sale - Enquiry Form",
        "field_data": [
            {"name": "full_name", "values": ["Rahul Sharma"]},
            {"name": "email", "values": ["rahul.sharma@example.com"]},
            {"name": "phone_number", "values": ["+919812345678"]},
            {"name": "city", "values": ["Ahmedabad"]},
        ],
    },
    {
        "id": f"{SAMPLE_PREFIX}003",
        "created_time": _ts(1.5),
        "platform": "facebook",
        "ad_id": "120210000000003",
        "ad_name": "FB - Lead Form Single Image",
        "campaign_id": "238400000000001",
        "campaign_name": "Summer Sale 2024",
        "adset_id": "238410000000003",
        "adset_name": "Ahmedabad - Lookalike 1%",
        "form_id": "1111111111",
        "form_name": "Summer Sale - Enquiry Form",
        "field_data": [
            {"name": "first_name", "values": ["Priya"]},
            {"name": "last_name", "values": ["Mehta"]},
            {"name": "email", "values": ["priya.mehta@example.com"]},
            {"name": "phone_number", "values": ["+919900112233"]},
            {"name": "city", "values": ["Ahmedabad"]},
            {"name": "job_title", "values": ["Procurement Manager"]},
            {"name": "company_name", "values": ["Mehta Enterprises"]},
        ],
    },
    {
        "id": f"{SAMPLE_PREFIX}004",
        "created_time": _ts(2.2),
        "platform": "instagram",
        "ad_id": "120210000000004",
        "ad_name": "IG - Monsoon Reel",
        "campaign_id": "238400000000002",
        "campaign_name": "Monsoon Offers",
        "adset_id": "238410000000004",
        "adset_name": "Mumbai - 24-40 - Home Decor",
        "form_id": "2222222222",
        "form_name": "Monsoon Offer - Contact Form",
        "field_data": [
            {"name": "full_name", "values": ["Sneha Iyer"]},
            {"name": "email", "values": ["sneha.iyer@example.com"]},
            {"name": "phone_number", "values": ["+919765432109"]},
            {"name": "city", "values": ["Mumbai"]},
        ],
    },
    {
        "id": f"{SAMPLE_PREFIX}005",
        "created_time": _ts(4.0),
        "platform": "facebook",
        "ad_id": "120210000000005",
        "ad_name": "FB - Festival Bonanza Video",
        "campaign_id": "238400000000003",
        "campaign_name": "Festival Bonanza",
        "adset_id": "238410000000005",
        "adset_name": "Surat - 28-50 - Jewellery Interest",
        "form_id": "2222222222",
        "form_name": "Festival - Enquiry Form",
        "field_data": [
            {"name": "full_name", "values": ["Vikram Desai"]},
            {"name": "email", "values": ["vikram.desai@example.com"]},
            {"name": "phone_number", "values": ["+919898989898"]},
            {"name": "city", "values": ["Surat"]},
            {"name": "company_name", "values": ["Desai Jewellers"]},
        ],
    },
    {
        "id": f"{SAMPLE_PREFIX}006",
        "created_time": _ts(6.5),
        "platform": "instagram",
        "ad_id": "120210000000006",
        "ad_name": "IG - Carousel New Collection",
        "campaign_id": "238400000000001",
        "campaign_name": "Summer Sale 2024",
        "adset_id": "238410000000006",
        "adset_name": "Pune - 22-35 - Fashion",
        "form_id": "1111111111",
        "form_name": "Summer Sale - Enquiry Form",
        "field_data": [
            {"name": "full_name", "values": ["Karan Malhotra"]},
            {"name": "email", "values": ["karan.malhotra@example.com"]},
            {"name": "phone_number", "values": ["+919811223344"]},
            {"name": "city", "values": ["Pune"]},
        ],
    },
    {
        "id": f"{SAMPLE_PREFIX}007",
        "created_time": _ts(12.0),
        "platform": "facebook",
        "ad_id": "120210000000007",
        "ad_name": "FB - Retargeting Image",
        "campaign_id": "238400000000003",
        "campaign_name": "Festival Bonanza",
        "adset_id": "238410000000007",
        "adset_name": "Ahmedabad - Website Visitors",
        "form_id": "2222222222",
        "form_name": "Festival - Enquiry Form",
        "field_data": [
            {"name": "full_name", "values": ["Meera Joshi"]},
            {"name": "email", "values": ["meera.joshi@example.com"]},
            {"name": "phone_number", "values": ["+919700099000"]},
            {"name": "city", "values": ["Ahmedabad"]},
            {"name": "job_title", "values": ["Founder"]},
        ],
    },
    {
        "id": f"{SAMPLE_PREFIX}008",
        "created_time": _ts(20.0),
        "platform": "instagram",
        "ad_id": "120210000000008",
        "ad_name": "IG - Brand Awareness Reel",
        "campaign_id": "238400000000002",
        "campaign_name": "Monsoon Offers",
        "adset_id": "238410000000008",
        "adset_name": "Delhi - 25-45 - Premium",
        "form_id": "2222222222",
        "form_name": "Monsoon Offer - Contact Form",
        "field_data": [
            {"name": "full_name", "values": ["Arjun Reddy"]},
            {"name": "email", "values": ["arjun.reddy@example.com"]},
            {"name": "phone_number", "values": ["+919655443322"]},
            {"name": "city", "values": ["Delhi"]},
            {"name": "company_name", "values": ["Reddy Constructions"]},
        ],
    },
]


async def seed():
    await init_db()
    try:
        # Attach sample leads to the first organization and an admin user.
        org = await Organization.find_one(Organization.is_deleted == False)
        if not org:
            print("ERROR: No organization found in the database.")
            print("Create/log in to an organization first, then re-run this script.")
            return

        user = await User.find_one(User.org_id == org.id, User.role == "admin")
        if not user:
            user = await User.find_one(User.org_id == org.id)
        if not user:
            print("ERROR: No user found for the organization.")
            return

        print(f"Attaching sample leads to org: {org.name}")
        print(f"created_by user: {user.email}\n")

        created = 0
        skipped = 0
        for raw in SAMPLE_LEADS:
            lead, was_created = await meta_service.save_meta_lead(raw, org_id=org.id, user_id=user.id)
            platform = raw["platform"].capitalize()
            name = raw["field_data"][0]["values"][0]
            if was_created:
                created += 1
                print(f"  + [{platform}] {name} ({raw['campaign_name']})")
            else:
                skipped += 1
                print(f"  = [{platform}] {name} already exists (skipped)")

        print(f"\nDone. Inserted {created} new sample lead(s), skipped {skipped} duplicate(s).")
        print("Open the Leads page to see them. Run with --remove to delete them later.")
    finally:
        await close_db()


async def remove():
    await init_db()
    try:
        collection = (
            Lead.get_pymongo_collection()
            if hasattr(Lead, "get_pymongo_collection")
            else Lead.get_motor_collection()
        )
        # Hard-delete the sample leads (they were never real).
        result = await collection.delete_many(
            {"meta_lead_id": {"$regex": f"^{SAMPLE_PREFIX}"}}
        )
        print(f"Removed {result.deleted_count} sample Meta lead(s).")
    finally:
        await close_db()


if __name__ == "__main__":
    if "--remove" in sys.argv:
        asyncio.run(remove())
    else:
        asyncio.run(seed())
