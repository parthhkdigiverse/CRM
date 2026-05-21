import asyncio
import urllib.request
import json
import sys
sys.path.append('.')
from motor.motor_asyncio import AsyncIOMotorClient
from services.token_service import create_access_token

async def get_token():
    from config import settings
    mc = AsyncIOMotorClient(settings.MONGODB_URL)
    db = mc[settings.MONGODB_DB_NAME]
    user = await db.users.find_one({"first_name": "prince"})
    if not user:
        return None
    return create_access_token(str(user['_id']), user.get('email', 'test@test.com'), user['role'])

async def main():
    token = await get_token()
    if not token:
        print("No user found")
        return
        
    import urllib.parse
    req = urllib.request.Request("http://localhost:8000/api/v1/payroll?month=" + urllib.parse.quote("May 2026"), headers={"Authorization": f"Bearer {token}"}, method="GET")
    try:
        with urllib.request.urlopen(req) as response:
            print("Status:", response.status)
            print("Response:", response.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code)
        print("Error Response:", e.read().decode())
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
