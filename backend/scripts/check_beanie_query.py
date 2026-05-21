import asyncio
import sys
sys.path.append('.')
from config import settings
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.payroll import Payroll
from beanie import PydanticObjectId

async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[Payroll])
    
    org_id = "6a0dff70d52147e73a1ec435"
    
    q1 = {"org_id": org_id, "is_deleted": {"$ne": True}}
    res1 = await Payroll.find(q1).to_list()
    print(f"Query with is_deleted: {len(res1)}")
    
    q2 = {"org_id": org_id}
    res2 = await Payroll.find(q2).to_list()
    print(f"Query without is_deleted: {len(res2)}")

if __name__ == "__main__":
    asyncio.run(run())
