import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['crm_db']
    user = await db.users.find_one({'first_name': 'prince'})
    print(user)

asyncio.run(run())
