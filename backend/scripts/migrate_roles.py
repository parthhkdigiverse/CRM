"""
Script to migrate old role values to the new 4-role system.
Usage: python scripts/migrate_roles.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from config import settings
from models.user import User
from models.organization import Organization
from utils.helpers import utc_now

ROLE_MAP = {
    "viewer": "employee",
    "sales_rep": "employee",
    "manager": "hr",
    "user": "employee",
}


async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[User, Organization])
    
    users = await User.find_all().to_list()
    migrated = 0
    
    for user in users:
        if user.role in ROLE_MAP:
            old = user.role
            user.role = ROLE_MAP[old]
            user.updated_at = utc_now()
            await user.save()
            print(f"  {user.email}: {old} → {user.role}")
            migrated += 1
    
    print(f"\n✅ Migrated {migrated} users. {len(users) - migrated} unchanged.")
    valid_roles = {'super_admin', 'admin', 'hr', 'employee'}
    for user in await User.find_all().to_list():
        if user.role not in valid_roles:
            print(f"  ⚠️  {user.email} has unknown role: {user.role}")


if __name__ == "__main__":
    asyncio.run(main())
