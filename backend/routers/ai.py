from typing import Optional
"""
AI assistant routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.contact import Contact
from models.lead import Lead
from models.deal import Deal
from models.activity import Activity
from schemas.ai import (
    SummarizeRequest,
    DraftEmailRequest,
    DealInsightRequest,
    LeadScoreExplainRequest,
    InvoiceWriterRequest,
    CRMQueryRequest,
    AIResponse
)
from schemas.common import SuccessResponse
from services import ai_service
from middleware.rate_limiter import rate_limit

router = APIRouter(prefix="/api/v1/ai", tags=["AI Assistant"])


async def get_entity_data(entity_type: str, entity_id: str, org_id: PydanticObjectId) -> dict:
    model_map = {
        "contact": Contact,
        "lead": Lead,
        "deal": Deal
    }
    model = model_map.get(entity_type)
    if not model:
        raise HTTPException(status_code=400, detail="Unsupported entity type")
        
    entity = await model.find_one(model.id == PydanticObjectId(entity_id), model.org_id == org_id, model.is_deleted == False)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
        
    return entity.model_dump(exclude={"id", "org_id", "created_by", "updated_by", "created_at", "updated_at"})


@router.post("/summarize", response_model=SuccessResponse, dependencies=[Depends(rate_limit(10, 60))])
async def summarize(
    data: SummarizeRequest,
    current_user: User = Depends(require_module_write("ai")),
    org: Optional[Organization] = Depends(get_current_org)
):
    entity_data = await get_entity_data(data.entity_type, data.entity_id, org.id)
    text, tokens = await ai_service.summarize_entity(entity_data, data.entity_type)
    return SuccessResponse(data=AIResponse(result=text, tokens_used=tokens).model_dump())


@router.post("/draft-email", response_model=SuccessResponse, dependencies=[Depends(rate_limit(10, 60))])
async def draft_email(
    data: DraftEmailRequest,
    current_user: User = Depends(require_module_write("ai")),
    org: Optional[Organization] = Depends(get_current_org)
):
    entity_data = await get_entity_data(data.entity_type, data.entity_id, org.id)
    text, tokens = await ai_service.draft_email(entity_data, data.entity_type, data.context)
    return SuccessResponse(data=AIResponse(result=text, tokens_used=tokens).model_dump())


@router.post("/deal-insight", response_model=SuccessResponse, dependencies=[Depends(rate_limit(10, 60))])
async def deal_insight(
    data: DealInsightRequest,
    current_user: User = Depends(require_module_write("ai")),
    org: Optional[Organization] = Depends(get_current_org)
):
    deal_data = await get_entity_data("deal", data.deal_id, org.id)
    
    # Fetch recent activities
    activities = await Activity.find(
        Activity.entity_type == "deal",
        Activity.entity_id == PydanticObjectId(data.deal_id),
        Activity.org_id == org.id
    ).sort(-Activity.created_at).limit(10).to_list()
    
    act_data = [a.model_dump(include={"type", "description", "created_at"}) for a in activities]
    
    text, tokens = await ai_service.analyze_deal(deal_data, act_data)
    return SuccessResponse(data=AIResponse(result=text, tokens_used=tokens).model_dump())


@router.post("/lead-score", response_model=SuccessResponse, dependencies=[Depends(rate_limit(10, 60))])
async def explain_lead_score(
    data: LeadScoreExplainRequest,
    current_user: User = Depends(require_module_write("ai")),
    org: Optional[Organization] = Depends(get_current_org)
):
    lead = await Lead.find_one(Lead.id == PydanticObjectId(data.lead_id), Lead.org_id == org.id, Lead.is_deleted == False)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    lead_data = lead.model_dump(exclude={"id", "org_id", "created_by", "updated_by", "created_at", "updated_at"})
    text, tokens = await ai_service.explain_lead_score(lead_data, lead.score)
    return SuccessResponse(data=AIResponse(result=text, tokens_used=tokens).model_dump())


@router.post("/generate-invoice-items", response_model=SuccessResponse, dependencies=[Depends(rate_limit(10, 60))])
async def generate_invoice_items(
    data: InvoiceWriterRequest,
    current_user: User = Depends(require_module_write("ai")),
    org: Optional[Organization] = Depends(get_current_org)
):
    text, tokens = await ai_service.generate_invoice_items(data.description)
    import json
    try:
        items = json.loads(text)
    except json.JSONDecodeError:
        items = []
        
    return SuccessResponse(data=AIResponse(result=json.dumps(items), tokens_used=tokens).model_dump())


@router.post("/query", response_model=SuccessResponse, dependencies=[Depends(rate_limit(10, 60))])
async def query_crm(
    data: CRMQueryRequest,
    current_user: User = Depends(require_module_write("ai")),
    org: Optional[Organization] = Depends(get_current_org)
):
    # For a real implementation, you'd use RAG or function calling to get specific data based on query.
    # Here we just pass some high-level metrics.
    from models.contact import Contact
    from models.lead import Lead
    from models.deal import Deal
    
    metrics = {
        "total_contacts": await Contact.find({"org_id": org.id, "is_deleted": {"$ne": True}}).count(),
        "total_leads": await Lead.find({"org_id": org.id, "is_deleted": {"$ne": True}}).count(),
        "active_deals_count": await Deal.find({"org_id": org.id, "is_deleted": {"$ne": True}, "stage": {"$nin": ["closed_won", "closed_lost"]}}).count(),
    }
    
    text, tokens = await ai_service.query_crm(data.query, metrics)
    return SuccessResponse(data=AIResponse(result=text, tokens_used=tokens).model_dump())
