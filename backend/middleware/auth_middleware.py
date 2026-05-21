"""
Auth middleware — JWT extraction, user loading, role-based access control.
"""

import logging
from typing import List, Optional, Dict, Any

from fastapi import Request, Depends, HTTPException, status
from beanie import PydanticObjectId

from models.user import User
from models.organization import Organization
from services.token_service import decode_access_token, is_token_blacklisted

logger = logging.getLogger(__name__)


async def get_current_user(request: Request) -> User:
    """
    FastAPI dependency: extract Bearer token, decode JWT, load user from DB.
    Raises 401 if invalid/expired/blacklisted.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header[7:]  # Strip "Bearer "
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check blacklist
    jti = payload.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Load user
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
        )

    return user


def require_roles(*roles: str):
    """
    Returns a FastAPI dependency that checks user role against allowed roles.
    Usage: Depends(require_roles('admin', 'super_admin'))
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(roles)}",
            )
        return current_user
    return role_checker


async def get_current_org(current_user: User = Depends(get_current_user)) -> Optional[Organization]:
    """
    FastAPI dependency: get the current user's organization.
    Returns None for super_admin (they operate across all orgs).
    Raises 403 for other roles if user has no org.
    """
    # Super admin doesn't belong to any org — return None
    if current_user.role == "super_admin":
        return None

    if not current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must set up or join an organization first",
        )

    try:
        org = await Organization.get(current_user.org_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return org


def org_filter(org: Optional[Organization], extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Build a MongoDB query filter scoped to an organization.
    If org is None (super_admin), returns a filter without org_id (all orgs).
    Always includes is_deleted != True.

    Usage:
        query = org_filter(org)                         # {"org_id": ..., "is_deleted": {"$ne": True}}
        query = org_filter(org, {"status": "active"})   # adds extra conditions
    """
    q: Dict[str, Any] = {"is_deleted": {"$ne": True}}
    if org:
        q["org_id"] = org.id
    if extra:
        q.update(extra)
    return q
