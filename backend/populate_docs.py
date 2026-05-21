import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from config import settings
from models.organization import Organization
from models.user import User
from models.document import DocumentModel

# Safe imports based on database.py setup
from database import ALL_MODELS

async def populate():
    print("Connecting to DB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=ALL_MODELS)
    
    # Get first org
    org = await Organization.find_one()
    if not org:
        print("No organization found. Please run the app or populate organization first.")
        return
        
    # Get first user
    user = await User.find_one()
    if not user:
        print("No user found.")
        return

    # Clear existing documents to support schema update
    await DocumentModel.find(DocumentModel.org_id == org.id).delete()

    storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
    os.makedirs(storage_dir, exist_ok=True)

    mock_docs = [
        {
            "name": "Q4-Financial-Report.pdf",
            "folder": "Finance",
            "size_bytes": 2516582,
            "uploaded_by_name": "Vikram T.",
            "uploaded_at": datetime(2026, 5, 8, 10, 0, tzinfo=timezone.utc),
            "is_shared": True
        },
        {
            "name": "Employee-Handbook-v3.docx",
            "folder": "HR",
            "size_bytes": 1153434,
            "uploaded_by_name": "Anjali K.",
            "uploaded_at": datetime(2026, 5, 6, 14, 30, tzinfo=timezone.utc),
            "is_shared": False
        },
        {
            "name": "Sales-Pipeline-May.xlsx",
            "folder": "Sales",
            "size_bytes": 798720,
            "uploaded_by_name": "Priya S.",
            "uploaded_at": datetime(2026, 5, 5, 9, 15, tzinfo=timezone.utc),
            "is_shared": False
        },
        {
            "name": "Brand-Guidelines.pdf",
            "folder": "Marketing",
            "size_bytes": 5872026,
            "uploaded_by_name": "Sneha R.",
            "uploaded_at": datetime(2026, 5, 2, 16, 45, tzinfo=timezone.utc),
            "is_shared": True
        },
        {
            "name": "Logo-Final.png",
            "folder": "Marketing",
            "size_bytes": 348160,
            "uploaded_by_name": "Arjun S.",
            "uploaded_at": datetime(2026, 4, 30, 11, 0, tzinfo=timezone.utc),
            "is_shared": False
        },
        {
            "name": "Vendor-Contract-Acme.pdf",
            "folder": "Legal",
            "size_bytes": 1887437,
            "uploaded_by_name": "Vikram T.",
            "uploaded_at": datetime(2026, 4, 28, 15, 20, tzinfo=timezone.utc),
            "is_shared": True
        }
    ]

    for m in mock_docs:
        # Create a safe unique file path
        storage_filename = f"placeholder_{m['name']}"
        file_path = os.path.join(storage_dir, storage_filename)
        
        # Write some sample content into it
        with open(file_path, "w") as f:
            f.write(f"This is the vault document content placeholder for {m['name']}.\n")
            f.write("Fully connected to the CRM vault database system.")
            
        doc = DocumentModel(
            name=m["name"],
            folder=m["folder"],
            size_bytes=m["size_bytes"],
            file_path=file_path,
            mime_type="application/octet-stream",
            org_id=org.id,
            uploaded_by=user.id,
            uploaded_by_name=m["uploaded_by_name"],
            uploaded_at=m["uploaded_at"],
            is_shared=m["is_shared"]
        )
        await doc.insert()
        print(f"Created doc: {doc.name}")

    print("Populate finished successfully!")

if __name__ == "__main__":
    asyncio.run(populate())
