import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017/ai_setu_crm')
    db = client['ai_setu_crm']
    companies = await db.companies.find({}).to_list(None)
    for c in companies:
        print(c.get('name'), c.get('contact_name'), c.get('linked_lead_id'))

if __name__ == '__main__':
    asyncio.run(check())
