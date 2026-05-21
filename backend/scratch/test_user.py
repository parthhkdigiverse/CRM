import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from config import settings
from models.user import User
from database import ALL_MODELS

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=ALL_MODELS)
    
    user = await User.find_one()
    if not user:
        print("No user found in DB!")
        return
        
    print("User fields:", user.model_fields.keys())
    print("User dict:", user.model_dump())
    try:
        print("user.email:", user.email)
    except Exception as e:
        print("Error accessing email:", e)
        
    try:
        print("user.first_name:", user.first_name)
    except Exception as e:
        print("Error accessing first_name:", e)
        
    try:
        print("user.last_name:", user.last_name)
    except Exception as e:
        print("Error accessing last_name:", e)
        
    try:
        print("user.full_name:", user.full_name)
    except Exception as e:
        print("Error accessing full_name:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
