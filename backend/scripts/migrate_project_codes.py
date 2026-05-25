import sys
import os
import asyncio

# Add the backend directory to the sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, close_db
from models.project import Project
from models.lead import Lead
from models.organization import Organization
from beanie import PydanticObjectId

async def migrate():
    await init_db()
    try:
        # Fetch all organizations
        orgs = await Organization.find_all().to_list()
        print(f"Starting migration for {len(orgs)} organizations...")
        
        for org in orgs:
            print(f"\nProcessing Organization: {org.name} (ID: {org.id})")
            
            # 1. Migrate existing active projects to sequential codes starting from 001
            projects = await Project.find(
                Project.org_id == org.id,
                Project.is_deleted == False
            ).sort("created_at").to_list()
            
            print(f"Found {len(projects)} existing active projects. Re-coding sequentially...")
            
            for idx, p in enumerate(projects, start=1):
                old_code = p.project_code
                new_code = f"{idx:03d}"
                p.project_code = new_code
                await p.save()
                print(f"  Project ID: {p.id} | Title: {p.title} | Code: {old_code} -> {new_code}")
                
            # 2. Check all assigned leads in this org and ensure they have projects
            assigned_leads = await Lead.find(
                Lead.org_id == org.id,
                Lead.assigned_to != None,
                Lead.is_deleted == False
            ).to_list()
            
            print(f"Found {len(assigned_leads)} active assigned leads. Verifying project links...")
            
            for lead in assigned_leads:
                existing_proj = await Project.find_one(
                    Project.linked_lead_id == lead.id,
                    Project.org_id == org.id
                )
                
                client_name = lead.company or lead.name
                
                if existing_proj:
                    if existing_proj.is_deleted:
                        # Restore project
                        existing_proj.is_deleted = False
                        existing_proj.deleted_at = None
                        existing_proj.deleted_by = None
                        existing_proj.assignee_ids = [lead.assigned_to]
                        await existing_proj.save()
                        print(f"  Restored project for lead {lead.name} (ID: {lead.id}) -> Project ID: {existing_proj.id}")
                else:
                    # Fetch next sequential code
                    # We query projects again to get the absolute latest state
                    latest_projects = await Project.find(
                        Project.org_id == org.id,
                        Project.is_deleted == False
                    ).to_list()
                    
                    max_num = 0
                    for lp in latest_projects:
                        try:
                            val = int(lp.project_code)
                            if val > max_num:
                                max_num = val
                        except ValueError:
                            import re
                            digits = re.findall(r'\d+', lp.project_code)
                            if digits:
                                val = int(digits[-1])
                                if val > max_num:
                                    max_num = val
                                    
                    next_num = max_num + 1
                    project_code = f"{next_num:03d}"
                    
                    # Create new project
                    title = f"Project: {client_name}" if lead.status == "converted" else f"Lead: {lead.name}"
                    new_proj = Project(
                        project_code=project_code,
                        title=title,
                        client_name=client_name,
                        status="planning",
                        budget=lead.value,
                        assignee_ids=[lead.assigned_to],
                        linked_lead_id=lead.id,
                        org_id=lead.org_id,
                        created_by=lead.created_by
                    )
                    await new_proj.insert()
                    print(f"  Created new project for lead {lead.name} (ID: {lead.id}) -> Code: {project_code} | Project ID: {new_proj.id}")
                    
        print("\nMigration completed successfully!")
    finally:
        await close_db()

if __name__ == "__main__":
    asyncio.run(migrate())
