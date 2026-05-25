"""
AI service — Claude API integration for CRM intelligence features.
"""

import json
import logging
from typing import Tuple, Optional
import httpx

from config import settings

logger = logging.getLogger(__name__)


async def call_groq(prompt: str, system_prompt: str = "", max_tokens: int = 1024) -> Tuple[str, int]:
    """
    Call Groq API with a prompt.
    Returns (response_text, tokens_used).
    Gracefully handles missing API key.
    """
    if not settings.GROQ_API_KEY:
        return "AI service not configured. Please set GROQ_API_KEY in your .env file.", 0

    try:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        else:
            messages.append({"role": "system", "content": "You are an AI assistant for AI-Setu CRM. Be concise and professional."})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": settings.GROQ_MODEL or "llama-3.3-70b-versatile",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.2
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code != 200:
                logger.error(f"Groq API error (status {response.status_code}): {response.text}")
                return f"Groq API error: {response.text}", 0
            
            result = response.json()
            text = result["choices"][0]["message"]["content"]
            usage = result.get("usage", {})
            tokens = usage.get("total_tokens", 0)
            return text, tokens
    except Exception as e:
        logger.error(f"Groq API exception: {e}")
        return f"Groq API error: {str(e)}", 0


async def summarize_entity(entity_data: dict, entity_type: str) -> Tuple[str, int]:
    """Summarize an entity's data into a 3-sentence brief."""
    prompt = f"""Summarize the following {entity_type} record into exactly 3 concise sentences 
covering the most important details and current status:

{json.dumps(entity_data, indent=2, default=str)}"""
    return await call_groq(prompt)


async def draft_email(entity_data: dict, entity_type: str, context: Optional[str] = None) -> Tuple[str, int]:
    """Generate a professional follow-up email draft."""
    ctx = f"\nAdditional context: {context}" if context else ""
    prompt = f"""Draft a professional follow-up email for this {entity_type}. 
Be concise, warm, and action-oriented.{ctx}

{entity_type} data:
{json.dumps(entity_data, indent=2, default=str)}

Return only the email body (no subject line). Use proper greeting and sign-off."""
    return await call_groq(prompt)


async def analyze_deal(deal_data: dict, activities: list) -> Tuple[str, int]:
    """Analyze a deal and suggest next best action."""
    prompt = f"""Analyze this sales deal and its activity history. 
Provide:
1. A brief assessment of the deal's health
2. Key risks or concerns
3. Recommended next action with specific steps

Deal:
{json.dumps(deal_data, indent=2, default=str)}

Recent activities:
{json.dumps(activities[:10], indent=2, default=str)}"""
    return await call_groq(prompt)


async def explain_lead_score(lead_data: dict, score: int) -> Tuple[str, int]:
    """Explain why a lead has its current score."""
    prompt = f"""This lead has a score of {score}/100 based on rule-based scoring.
Explain why they have this score and what actions could improve it.

Scoring rules:
- Has email: +20 points
- Has phone: +15 points
- Source referral: +20, event: +15, social: +10
- Has company: +10 points
- Status contacted: +10, qualified: +20

Lead data:
{json.dumps(lead_data, indent=2, default=str)}"""
    return await call_groq(prompt)


async def generate_invoice_items(description: str) -> Tuple[str, int]:
    """Generate invoice line items from natural language description."""
    prompt = f"""Convert this natural language description into invoice line items.
Return a JSON array of objects with keys: description, quantity, unit_price, tax_percent.
Only return the JSON array, no other text.

Description: {description}"""
    return await call_groq(
        prompt,
        system_prompt="You are an invoice processing assistant. Return only valid JSON arrays."
    )


async def query_crm(query: str, available_data: dict) -> Tuple[str, int]:
    """Process a natural language CRM query and return structured results."""
    prompt = f"""The user is asking about their CRM data. Answer their question based on the data provided.
Be specific with numbers and names. If the data doesn't contain the answer, say so.

User question: {query}

Available CRM data summary:
{json.dumps(available_data, indent=2, default=str)}"""
    return await call_groq(prompt)
