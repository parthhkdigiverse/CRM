import asyncio
import urllib.request
import urllib.parse
import json
import sys
sys.path.append('.')
from config import settings
from motor.motor_asyncio import AsyncIOMotorClient
from services.token_service import create_access_token

async def get_token():
    mc = AsyncIOMotorClient(settings.MONGODB_URL)
    db = mc[settings.MONGODB_DB_NAME]
    user = await db.users.find_one({"role": "super_admin"}) or await db.users.find_one()
    print("User role:", user['role'])
    return create_access_token(str(user['_id']), user.get('email', 'test@test.com'), user['role'])

async def main():
    token = await get_token()
    req = urllib.request.Request("http://localhost:8000/api/v1/payroll?month=" + urllib.parse.quote("May 2026"), headers={"Authorization": f"Bearer {token}"}, method="GET")
    with urllib.request.urlopen(req) as response:
        print("Response:", response.read().decode())

if __name__ == "__main__":
    asyncio.run(main())
