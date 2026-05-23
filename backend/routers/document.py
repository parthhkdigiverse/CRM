"""
Document router endpoints — file upload, list, download, and delete.
"""

import os
import asyncio
import secrets
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse

from middleware.auth_middleware import get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write
from models.user import User
from models.organization import Organization
from models.document import DocumentModel
from models.employee import Employee
from schemas.common import SuccessResponse
from utils.helpers import utc_now, parse_object_id, escape_regex, paginate_params, build_paginated_response
from utils.file_validation import validate_upload
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "documents")
os.makedirs(STORAGE_DIR, exist_ok=True)


@router.post("", response_model=SuccessResponse)
async def upload_document(
    file: UploadFile = File(...),
    folder: str = Form("General"),
    is_shared: bool = Form(False),
    current_user: User = Depends(require_module_write("documents")),
    org: Optional[Organization] = Depends(get_current_org)
):
    upload = await validate_upload(file)
    filename = upload.filename
    safe_folder = re.sub(r"[^A-Za-z0-9 _-]+", "_", (folder or "General").strip())[:60] or "General"
    
    # Check current user employee details to get their name
    uploaded_by_name = current_user.full_name or current_user.email
    emp = await Employee.find_one(Employee.user_id == current_user.id, Employee.is_deleted == False)
    if emp:
        uploaded_by_name = emp.name

    # Generate unique storage filename
    unique_id = secrets.token_hex(16)
    storage_filename = f"{unique_id}.{upload.extension}"
    file_path = os.path.join(STORAGE_DIR, storage_filename)
    if not os.path.abspath(file_path).startswith(os.path.abspath(STORAGE_DIR)):
        raise HTTPException(status_code=400, detail="Invalid storage path")

    # Save file contents locally
    size_bytes = 0
    try:
        with open(file_path, "wb") as f:
            while content := await file.read(1024 * 1024):  # 1MB chunks
                f.write(content)
                size_bytes += len(content)
                if size_bytes > upload.size_bytes:
                    raise HTTPException(status_code=413, detail="Uploaded file is too large")
    except Exception as e:
        if os.path.exists(file_path):
            await asyncio.to_thread(os.remove, file_path)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to save file")

    # Insert Beanie document record
    doc = DocumentModel(
        name=filename,
        folder=safe_folder,
        size_bytes=size_bytes,
        file_path=file_path,
        mime_type=upload.mime_type,
        org_id=org.id if org else None,
        uploaded_by=current_user.id,
        uploaded_by_name=uploaded_by_name,
        is_shared=is_shared
    )
    await doc.insert()
    await log_action(str(org.id) if org else None, str(current_user.id), "create", "documents", str(doc.id), changes={"name": filename, "folder": folder})

    return SuccessResponse(
        data={
            "id": str(doc.id),
            "name": doc.name,
            "folder": doc.folder,
            "size_bytes": doc.size_bytes,
            "uploaded_by_name": doc.uploaded_by_name,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "is_shared": doc.is_shared
        },
        message="Document uploaded successfully"
    )


@router.get("", response_model=SuccessResponse)
async def list_documents(
    folder: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_module_read("documents")),
    org: Optional[Organization] = Depends(get_current_org)
):
    query = org_filter(org)
    
    if folder and folder.lower() != "all":
        # Case insensitive match for folders e.g. HR, Sales, Finance
        query["folder"] = {"$regex": f"^{escape_regex(folder)}$", "$options": "i"}

    if search:
        query["name"] = {"$regex": escape_regex(search), "$options": "i"}

    # Employees can only see their own documents or shared documents
    if current_user.role == "employee":
        query["$or"] = [
            {"uploaded_by": current_user.id},
            {"is_shared": True}
        ]

    skip, limit = paginate_params(page, per_page)
    docs = await DocumentModel.find(query).sort("-uploaded_at").skip(skip).limit(limit).to_list()
    total = await DocumentModel.find(query).count()

    data = []
    for doc in docs:
        d = doc.model_dump()
        d["id"] = str(d.pop("_id", doc.id))
        d["org_id"] = str(d["org_id"]) if d.get("org_id") else None
        d["uploaded_by"] = str(d["uploaded_by"])
        d["uploaded_at"] = doc.uploaded_at.isoformat()
        data.append(d)

    return SuccessResponse(data=build_paginated_response(data, total, page, per_page))


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: User = Depends(require_module_read("documents")),
    org: Optional[Organization] = Depends(get_current_org)
):
    object_id = parse_object_id(document_id, "document_id")
    doc = await DocumentModel.find_one(
        org_filter(org, {"_id": object_id})
    )
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found or missing on disk")
    if current_user.role == "employee" and str(doc.uploaded_by) != str(current_user.id) and not doc.is_shared:
        raise HTTPException(status_code=403, detail="You can only download your own or shared documents")

    return FileResponse(
        path=doc.file_path,
        filename=doc.name,
        media_type=doc.mime_type or "application/octet-stream"
    )


@router.delete("/{document_id}", response_model=SuccessResponse)
async def delete_document(
    document_id: str,
    current_user: User = Depends(require_module_write("documents")),
    org: Optional[Organization] = Depends(get_current_org)
):
    object_id = parse_object_id(document_id, "document_id")
    doc = await DocumentModel.find_one(
        org_filter(org, {"_id": object_id})
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role == "employee" and str(doc.uploaded_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only delete your own documents")

    # Mark as deleted in database
    doc.is_deleted = True
    await doc.save()

    await log_action(str(org.id) if org else None, str(current_user.id), "delete", "documents", str(doc.id), changes={"name": doc.name})

    # Try to delete local file from storage
    try:
        if os.path.exists(doc.file_path):
            await asyncio.to_thread(os.remove, doc.file_path)
    except Exception as e:
        pass

    return SuccessResponse(message="Document deleted successfully")
