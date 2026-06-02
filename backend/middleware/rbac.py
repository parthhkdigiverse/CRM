"""
RBAC permission matrix and dependency helpers.
"""

from fastapi import Depends, HTTPException, status

from middleware.auth_middleware import get_current_user
from models.user import User

# Permission levels: 'full' (CRUD), 'read' (GET only), 'own' (own records only), None (no access)
ROLE_PERMISSIONS = {
    'super_admin': {
        'leads': 'full', 'contacts': 'full', 'companies': 'full', 'deals': 'full',
        'invoices': 'full', 'projects': 'full', 'tasks': 'full', 'employees': 'full',
        'attendance': 'full', 'payroll': 'full', 'targets': 'full', 'meetings': 'full',
        'documents': 'full', 'ai': 'full', 'audit_logs': 'full', 'settings': 'full',
        'organization': 'full', 'admin_panel': 'full', 'inventory': 'full', 'sales': 'full',
        'finance': 'full', 'reports': 'full', 'expenses': 'full',
    },
    'admin': {
        'leads': 'full', 'contacts': 'full', 'companies': 'full', 'deals': 'full',
        'invoices': 'full', 'projects': 'full', 'tasks': 'full', 'employees': 'full',
        'attendance': 'full', 'payroll': 'full', 'targets': 'full', 'meetings': 'full',
        'documents': 'full', 'ai': 'full', 'audit_logs': 'full', 'settings': 'full',
        'organization': 'full', 'inventory': 'full', 'sales': 'full',
        'finance': 'full', 'reports': 'full', 'expenses': 'full',
    },
    'hr': {
        'leads': 'full', 'contacts': 'full', 'companies': 'read', 'deals': 'read',
        'invoices': 'read', 'projects': 'read', 'tasks': 'full', 'employees': 'full',
        'attendance': 'full', 'payroll': 'full', 'targets': 'full', 'meetings': 'full',
        'documents': 'full', 'ai': 'full', 'audit_logs': 'read',
        'inventory': 'read', 'sales': 'read', 'expenses': 'read',
    },
    'employee': {
        'contacts': 'read', 'companies': 'read', 'projects': 'own',
        'tasks': 'own', 'attendance': 'own', 'targets': 'own',
        'meetings': 'own', 'documents': 'own', 'ai': 'full',
        'payroll': 'own', 'employees': 'read', 'inventory': 'read', 'sales': 'own', 'expenses': 'own',
    },
}


def get_permission(role: str, module: str) -> str | None:
    """Get the permission level for a role on a module."""
    return ROLE_PERMISSIONS.get(role, {}).get(module)


# Maps RBAC route-module names to the feature-access catalog keys where they differ.
_FEATURE_KEY_ALIASES = {
    "deals": "crm",
    "meetings": "calendar",
}

# Roles whose visibility can be restricted by the org's feature_access matrix.
_FEATURE_CONFIGURABLE_ROLES = {"hr", "employee"}


async def _feature_value(current_user: User, module: str) -> bool | None:
    """
    Return the org's feature-access boolean for hr/employee on a module.
    Returns None when the module isn't feature-configurable (caller should fall
    back to the static ROLE_PERMISSIONS). Defaults to allow on any error.
    """
    role = current_user.role
    if role not in _FEATURE_CONFIGURABLE_ROLES or not current_user.org_id:
        return None
    feature_key = _FEATURE_KEY_ALIASES.get(module, module)
    try:
        from schemas.feature_access import MODULE_KEYS, resolve_feature_access
        if feature_key not in MODULE_KEYS:
            return None
        from models.organization import Organization
        org = await Organization.get(current_user.org_id)
        if not org:
            return None
        resolved = resolve_feature_access(getattr(org, "feature_access", {}) or {})
        return bool(resolved.get(role, {}).get(feature_key, True))
    except Exception:
        return None


async def _effective_permission(current_user: User, module: str) -> str | None:
    """
    Resolve the effective permission level for a user on a module.

    For HR/Employee the org's feature matrix is AUTHORITATIVE:
      - feature disabled  -> None (no access), even if ROLE_PERMISSIONS grants it
      - feature enabled   -> their natural ROLE_PERMISSIONS level, or 'full' if the
                             role wouldn't normally have the module at all (grant).
    Admin / super_admin are unaffected (always their static permission).
    """
    base = get_permission(current_user.role, module)
    feature = await _feature_value(current_user, module)
    if feature is None:
        return base  # not configurable / admin / no org -> static behaviour
    if feature is False:
        return None  # explicitly disabled by admin
    # Enabled: grant. Keep natural scope if present, else give full access.
    return base or "full"


async def _feature_allowed(current_user: User, module: str) -> bool:
    """Backwards-compatible helper: True if the module is visible to the user."""
    return (await _effective_permission(current_user, module)) is not None


def require_module_read(module: str):
    """Dependency: user must have read access, governed by the org feature matrix for hr/employee."""
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        perm = await _effective_permission(current_user, module)
        if not perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have access to {module}"
            )
        return current_user
    return checker


def require_module_write(module: str):
    """Dependency: user must have write access (full or own), governed by the feature matrix for hr/employee."""
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        perm = await _effective_permission(current_user, module)
        if perm not in ('full', 'own'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have write access to {module}"
            )
        return current_user
    return checker


def require_module_full(module: str):
    """Dependency: user must have full access (not 'own' or 'read') to this module."""
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        perm = get_permission(current_user.role, module)
        if perm != 'full':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You need full access to {module}"
            )
        return current_user
    return checker
