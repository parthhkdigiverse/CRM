"""
Database initialization — Motor async client + Beanie ODM setup.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from config import settings
from models.user import User
from models.organization import Organization
from models.contact import Contact
from models.company import Company
from models.lead import Lead
from models.deal import Deal
from models.invoice import Invoice
from models.task import Task
from models.activity import Activity
from models.employee import Employee
from models.notification import Notification
from models.audit_log import AuditLog
from models.refresh_token import RefreshToken
from models.blacklisted_token import BlacklistedToken
from models.attendance import Attendance
from models.project import Project
from models.meeting import Meeting
from models.document import DocumentModel
from models.target import Target
from models.payroll import Payroll
from models.leave import Leave
from models.chat import ChatRoom, ChatMessage

_client: AsyncIOMotorClient = None

ALL_MODELS = [
    User,
    Organization,
    Contact,
    Company,
    Lead,
    Deal,
    Invoice,
    Task,
    Activity,
    Employee,
    Notification,
    AuditLog,
    RefreshToken,
    BlacklistedToken,
    Attendance,
    Project,
    Meeting,
    DocumentModel,
    Target,
    Payroll,
    Leave,
    ChatRoom,
    ChatMessage,
]


async def init_db() -> None:
    """Initialize the MongoDB connection and Beanie ODM."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = _client[settings.MONGODB_DB_NAME]
    await init_beanie(database=database, document_models=ALL_MODELS)


async def close_db() -> None:
    """Close the MongoDB connection."""
    global _client
    if _client:
        _client.close()
        _client = None
