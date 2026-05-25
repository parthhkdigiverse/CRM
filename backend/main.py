"""
AI-Setu CRM Backend — Main Application Entrypoint
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from fastapi.staticfiles import StaticFiles
import os

from config import settings
from database import init_db, close_db
from middleware.security import RequestSecurityMiddleware, SecurityHeadersMiddleware
from schemas.common import ErrorResponse, ErrorDetail
from routers import auth, organization, contact, company, lead, deal, invoice, task, employee, ai, attendance, project, meeting, document, audit_log, target, super_admin, payroll, leave, chat, inventory, sale, finance, reports, expense, overtime, notification
from utils.logging import configure_secure_logging, redact

configure_secure_logging(logging.INFO if not settings.is_production else logging.WARNING)
# Suppress noisy library logs specifically, just in case
logging.getLogger("pymongo").setLevel(logging.ERROR)
logging.getLogger("uvicorn.access").setLevel(logging.ERROR)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for FastAPI application."""
    logging.info("Starting AI-Setu CRM Backend...")
    # Startup
    await init_db()
    logging.info("Database connection initialized.")
    
    # Sync existing invoices to the Sales collection
    try:
        from routers.invoice import sync_invoice_to_sale
        from models.invoice import Invoice
        logging.info("Checking for unsynced invoices...")
        all_invoices = await Invoice.find(Invoice.is_deleted == False).to_list()
        count = 0
        for inv in all_invoices:
            await sync_invoice_to_sale(inv)
            count += 1
        if count > 0:
            logging.info(f"Verified/synced {count} existing invoices to the Sales collection.")
    except Exception as e:
        logging.error(f"Failed to run startup invoice-sales migration: {e}")
        
    yield
    # Shutdown
    await close_db()
    logging.info("Database connection closed.")


app = FastAPI(
    title="AI-Setu CRM API",
    description="Production-grade CRM + ERP API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/api/redoc" if settings.APP_ENV != "production" else None,
    openapi_url="/api/openapi.json" if settings.APP_ENV != "production" else None,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSecurityMiddleware)

# Serve only validated public avatars. General uploaded documents are never exposed as static files.
os.makedirs("storage/avatars", exist_ok=True)
app.mount("/storage/avatars", StaticFiles(directory="storage/avatars"), name="avatars")

# CORS Middleware
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format pydantic validation errors nicely."""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({"field": field, "msg": error["msg"]})
        
    error_response = ErrorResponse(
        success=False,
        request_id=getattr(request.state, "request_id", ""),
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message="Input validation failed",
            details=errors
        )
    )
    logging.warning("Validation error on %s: %s", request.url.path, redact(errors))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump()
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fallback exception handler to ensure standard response format."""
    if settings.is_production:
        logging.error("Unhandled exception on %s", request.url.path)
    else:
        logging.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    error_response = ErrorResponse(
        success=False,
        request_id=getattr(request.state, "request_id", ""),
        error=ErrorDetail(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred. Please try again later."
        )
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump()
    )


# Include Routers
app.include_router(auth.router)
app.include_router(organization.router)
app.include_router(contact.router)
app.include_router(company.router)
app.include_router(lead.router)
app.include_router(deal.router)
app.include_router(invoice.router)
app.include_router(task.router)
app.include_router(employee.router)
app.include_router(attendance.router)
app.include_router(project.router)
app.include_router(meeting.router)
app.include_router(document.router)
app.include_router(ai.router)
app.include_router(audit_log.router)
app.include_router(target.router)
app.include_router(super_admin.router)
app.include_router(payroll.router)
app.include_router(leave.router)
app.include_router(chat.router)
app.include_router(inventory.router)
app.include_router(sale.router)
app.include_router(expense.router)
app.include_router(finance.router)
app.include_router(reports.router)
app.include_router(overtime.router)
app.include_router(notification.router)


@app.get("/api/health", tags=["System"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "ai-setu-crm-api", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not settings.is_production, access_log=False)
