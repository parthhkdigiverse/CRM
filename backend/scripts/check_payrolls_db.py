import asyncio
import sys
sys.path.append('.')
from config import settings
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    payrolls = await db.payrolls.find().to_list(100)
    print(f"Total payrolls in DB: {len(payrolls)}")
    if payrolls:
        print(f"Sample org_id type: {type(payrolls[0].get('org_id'))}, value: {payrolls[0].get('org_id')}")

if __name__ == "__main__":
    asyncio.run(run())
