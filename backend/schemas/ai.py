"""
AI Assistant request/response schemas.
"""

from typing import Optional

from pydantic import BaseModel


class SummarizeRequest(BaseModel):
    entity_type: str
    entity_id: str


class DraftEmailRequest(BaseModel):
    entity_type: str
    entity_id: str
    context: Optional[str] = None


class DealInsightRequest(BaseModel):
    deal_id: str


class LeadScoreExplainRequest(BaseModel):
    lead_id: str


class InvoiceWriterRequest(BaseModel):
    description: str


class CRMQueryRequest(BaseModel):
    query: str


class AIResponse(BaseModel):
    result: str
    tokens_used: Optional[int] = None
