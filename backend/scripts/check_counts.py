import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['ai_setu_crm']
    count = await db.users.count_documents({})
    print(f"Users count in ai_setu_crm.users: {count}")

    # Let's check crm_db just in case!
    db2 = client['crm_db']
    count2 = await db2.users.count_documents({})
    print(f"Users count in crm_db.users: {count2}")

if __name__ == "__main__":
    asyncio.run(run())
