"""
AI-Setu CRM Backend — Main Application Entrypoint
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from config import settings
from database import init_db, close_db
from schemas.common import ErrorResponse, ErrorDetail
from routers import auth, organization, contact, company, lead, deal, invoice, task, employee, ai, attendance, project, meeting, document, audit_log, target, super_admin, payroll, leave, chat

# Setup basic logging
logging.basicConfig(
    level=logging.INFO if settings.APP_ENV == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for FastAPI application."""
    logging.info("Starting AI-Setu CRM Backend...")
    # Startup
    await init_db()
    logging.info("Database connection initialized.")
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

# CORS Middleware
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message="Input validation failed",
            details=errors
        )
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump()
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fallback exception handler to ensure standard response format."""
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    error_response = ErrorResponse(
        success=False,
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


@app.get("/api/health", tags=["System"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "ai-setu-crm-api", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
