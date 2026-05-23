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
    },
    'admin': {
        'leads': 'full', 'contacts': 'full', 'companies': 'full', 'deals': 'full',
        'invoices': 'full', 'projects': 'full', 'tasks': 'full', 'employees': 'full',
        'attendance': 'full', 'payroll': 'full', 'targets': 'full', 'meetings': 'full',
        'documents': 'full', 'ai': 'full', 'audit_logs': 'full', 'settings': 'full',
        'organization': 'full', 'inventory': 'full', 'sales': 'full',
    },
    'hr': {
        'leads': 'full', 'contacts': 'full', 'companies': 'read', 'deals': 'read',
        'invoices': 'read', 'projects': 'read', 'tasks': 'full', 'employees': 'full',
        'attendance': 'full', 'payroll': 'full', 'targets': 'full', 'meetings': 'full',
        'documents': 'full', 'ai': 'full', 'audit_logs': 'read',
        'inventory': 'read', 'sales': 'read',
    },
    'employee': {
        'contacts': 'read', 'companies': 'read', 'projects': 'own',
        'tasks': 'own', 'attendance': 'own', 'targets': 'own',
        'meetings': 'own', 'documents': 'own', 'ai': 'full',
        'payroll': 'own', 'employees': 'read', 'inventory': 'read', 'sales': 'own',
    },
}


def get_permission(role: str, module: str) -> str | None:
    """Get the permission level for a role on a module."""
    return ROLE_PERMISSIONS.get(role, {}).get(module)


def require_module_read(module: str):
    """Dependency: user must have at least read access to this module."""
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        perm = get_permission(current_user.role, module)
        if not perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have access to {module}"
            )
        return current_user
    return checker


def require_module_write(module: str):
    """Dependency: user must have write access (full or own) to this module."""
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        perm = get_permission(current_user.role, module)
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
