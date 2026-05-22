import asyncio
from database import init_db
from models.project import Project
from models.lead import Lead

async def test():
    await init_db()
    projects = await Project.find().to_list()
    for p in projects:
        print(f"Project: {p.title}, ID: {p.id}, Deleted: {p.is_deleted}")
    
    leads = await Lead.find().to_list()
    for l in leads:
        print(f"Lead: {l.name}, Status: {l.status}, ID: {l.id}")

if __name__ == "__main__":
    asyncio.run(test())
