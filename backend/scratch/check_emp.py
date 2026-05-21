import sys
sys.path.append('.')
import asyncio
import database
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.employee import Employee
from utils.security import decrypt_field

async def run():
    from config import settings
    await init_beanie(database=AsyncIOMotorClient(settings.MONGODB_URL)[settings.MONGODB_DB_NAME], document_models=database.ALL_MODELS)
    emps = await Employee.find().to_list()
    for e in emps:
        print(f"Name: {e.name}, Encrypted: {e.salary_encrypted}")
        if e.salary_encrypted:
            try:
                dec = decrypt_field(e.salary_encrypted)
                print(f"   Decrypted: {dec}")
            except Exception as ex:
                print(f"   Decryption error: {ex}")

if __name__ == '__main__':
    asyncio.run(run())
