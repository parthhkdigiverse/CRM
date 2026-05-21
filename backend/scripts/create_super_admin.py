"""
Script to create or promote a user to super_admin role.
Usage: python scripts/create_super_admin.py <email>
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from config import settings
from models.user import User
from models.organization import Organization
from utils.helpers import utc_now


async def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/create_super_admin.py <email>")
        print("  Promotes an existing user to super_admin role.")
        sys.exit(1)
    
    email = sys.argv[1].lower().strip()
    
    # Connect to DB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[User, Organization])
    
    # Find user
    user = await User.find_one(User.email == email)
    if not user:
        print(f"Error: No user found with email '{email}'")
        print("The user must register first, then run this script.")
        sys.exit(1)
    
    old_role = user.role
    user.role = "super_admin"
    user.updated_at = utc_now()
    await user.save()
    
    print(f"SUCCESS: User '{user.full_name}' ({email}) promoted to super_admin")
    print(f"   Previous role: {old_role}")
    print(f"   Org ID: {user.org_id or 'None'}")


if __name__ == "__main__":
    asyncio.run(main())
