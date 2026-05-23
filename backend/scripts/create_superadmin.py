import sys
import os
import asyncio

# Add the backend directory to the sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, close_db
from models.user import User
from utils.security import hash_password

async def main():
    await init_db()
    
    email = "superadmin@crm.com"
    password = "SuperPassword123!"
    
    existing = await User.find_one(User.email == email)
    if existing:
        print(f"User {email} already exists. Updating password...")
        existing.hashed_password = hash_password(password)
        existing.role = "super_admin"
        await existing.save()
        print("Updated existing user to super_admin.")
    else:
        user = User(
            email=email,
            hashed_password=hash_password(password),
            first_name="Super",
            last_name="Admin",
            role="super_admin",
            is_active=True,
            is_email_verified=True,
            auth_provider="local"
        )
        await user.insert()
        print(f"Created new super_admin user: {email} / {password}")

    await close_db()

if __name__ == "__main__":
    asyncio.run(main())
