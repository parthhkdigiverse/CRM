import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from config import settings
from models.lead import Lead
from models.project import Project
from models.company import Company
from models.user import User
from models.organization import Organization
from models.employee import Employee
from models.contact import Contact

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME], 
        document_models=[Lead, Project, Company, User, Organization, Employee, Contact]
    )
    
    leads = await Lead.find(Lead.status != "converted").to_list()
    count = 0
    for lead in leads:
        company_name = lead.company if lead.company else lead.name
        projects = await Project.find(
            Project.org_id == lead.org_id,
            Project.client_name == company_name,
            Project.is_deleted == False
        ).to_list()
        
        for p in projects:
            p.is_deleted = True
            await p.save()
            count += 1
            print(f"Deleted project '{p.title}' for non-converted lead '{lead.name}'")
            
    print(f"Cleanup complete. Deleted {count} projects.")

if __name__ == "__main__":
    asyncio.run(main())
