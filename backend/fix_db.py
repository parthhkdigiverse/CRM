import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def fix_data():
    load_dotenv('C:/crm/.env')
    db_url = os.environ.get('MONGODB_URL')
    print(f"Connecting to {db_url}")
    client = AsyncIOMotorClient(db_url)
    db = client['ai_setu_crm']
    companies = await db.companies.find({}).to_list(None)
    print(f"Found {len(companies)} companies")
    for comp in companies:
        if comp.get('linked_lead_id'):
            lead = await db.leads.find_one({'_id': comp['linked_lead_id']})
            if lead:
                await db.companies.update_one({'_id': comp['_id']}, {'$set': {'contact_name': lead.get('name', ''), 'annual_revenue': lead.get('value', 0)}})
                print(f"Updated {comp.get('name')} with contact {lead.get('name')} and revenue {lead.get('value', 0)}")

if __name__ == '__main__':
    asyncio.run(fix_data())
