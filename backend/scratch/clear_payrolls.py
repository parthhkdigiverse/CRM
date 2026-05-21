import sys
sys.path.append('.')
import asyncio
import database
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.payroll import Payroll
from config import settings

async def run():
    await init_beanie(database=AsyncIOMotorClient(settings.MONGODB_URL)[settings.MONGODB_DB_NAME], document_models=database.ALL_MODELS)
    await Payroll.delete_all()
    print("Deleted all payroll records.")

if __name__ == '__main__':
    asyncio.run(run())
