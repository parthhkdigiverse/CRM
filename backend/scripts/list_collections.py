import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
async def run():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['ai_setu_crm']
    print(await db.list_collection_names())
if __name__ == "__main__":
    asyncio.run(run())
