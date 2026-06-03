"""
Global Search Route.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends
import asyncio

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from models.user import User
from models.organization import Organization
from models.lead import Lead
from models.contact import Contact
from models.company import Company
from models.invoice import Invoice
from models.deal import Deal
from models.project import Project
from schemas.common import SuccessResponse

router = APIRouter(prefix="/api/v1/search", tags=["Search"])


@router.get("", response_model=SuccessResponse)
async def global_search(
    q: str,
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    """Search globally across multiple CRM modules (leads, contacts, companies, invoices, deals, projects)."""
    if not q or len(q.strip()) < 2:
        return SuccessResponse(data=[], message="Search query too short")

    query_str = q.strip()
    regex_query = {"$regex": query_str, "$options": "i"}
    base_filter = org_filter(org)

    async def search_leads():
        leads = await Lead.find(
            base_filter,
            {"$or": [
                {"name": regex_query},
                {"email": regex_query},
                {"company": regex_query}
            ]}
        ).limit(5).to_list()
        return [{"id": str(x.id), "title": x.name, "subtitle": x.company or x.email, "type": "lead", "href": "/leads"} for x in leads]

    async def search_contacts():
        contacts = await Contact.find(
            base_filter,
            {"$or": [
                {"first_name": regex_query},
                {"last_name": regex_query},
                {"email": regex_query}
            ]}
        ).limit(5).to_list()
        return [{"id": str(x.id), "title": f"{x.first_name} {x.last_name}", "subtitle": x.email or x.phone, "type": "contact", "href": "/contacts"} for x in contacts]

    async def search_companies():
        companies = await Company.find(
            base_filter,
            {"$or": [
                {"name": regex_query},
                {"email": regex_query}
            ]}
        ).limit(5).to_list()
        return [{"id": str(x.id), "title": x.name, "subtitle": x.email or x.website, "type": "company", "href": "/companies"} for x in companies]

    async def search_invoices():
        invoices = await Invoice.find(
            base_filter,
            {"$or": [
                {"invoice_number": regex_query},
                {"customer_name": regex_query}
            ]}
        ).limit(5).to_list()
        return [{"id": str(x.id), "title": x.invoice_number, "subtitle": f"Client: {x.customer_name} • Total: {x.currency} {x.total:,.2f}", "type": "invoice", "href": "/invoices"} for x in invoices]

    async def search_deals():
        deals = await Deal.find(
            base_filter,
            {"title": regex_query}
        ).limit(5).to_list()
        return [{"id": str(x.id), "title": x.title, "subtitle": f"Stage: {x.stage} • Value: {x.currency} {x.value:,.2f}", "type": "deal", "href": "/crm"} for x in deals]

    async def search_projects():
        projects = await Project.find(
            base_filter,
            {"$or": [
                {"title": regex_query},
                {"project_code": regex_query},
                {"client_name": regex_query}
            ]}
        ).limit(5).to_list()
        return [{"id": str(x.id), "title": f"[{x.project_code}] {x.title}", "subtitle": f"Client: {x.client_name} • Progress: {x.progress}%", "type": "project", "href": "/projects"} for x in projects]

    results = await asyncio.gather(
        search_leads(),
        search_contacts(),
        search_companies(),
        search_invoices(),
        search_deals(),
        search_projects()
    )

    flat_results = []
    for r in results:
        flat_results.extend(r)

    return SuccessResponse(data=flat_results)
