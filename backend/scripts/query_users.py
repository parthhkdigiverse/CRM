import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import pprint

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['crm_db']
    users = await db.users.find().to_list(length=10)
    for u in users:
        print(f"Name: {u.get('first_name')} {u.get('last_name')}, Email: {u.get('email')}, Role: {u.get('role')}")

asyncio.run(run())
