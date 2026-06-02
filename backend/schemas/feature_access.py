"""
Feature access (per-organization, per-role module visibility) schemas + registry.

Admins toggle which modules are visible to `hr` and `employee` roles. Admin and
super_admin always see everything (they manage the toggles), so they are not
configurable here.
"""

from typing import Dict
from pydantic import BaseModel

# Roles that can be configured by the admin (admin/super_admin are always full).
CONFIGURABLE_ROLES = ["hr", "employee"]

# The catalog of toggleable modules. `key` must match the RBAC module keys used
# by the routes and the frontend route/sidebar gating.
# `default` is the fallback visibility when an org hasn't set an explicit value.
FEATURE_MODULES = [
    {"key": "leads", "label": "Leads", "group": "Business",
     "roles": {"hr": True, "employee": False}},
    {"key": "crm", "label": "CRM / Deals", "group": "Business",
     "roles": {"hr": True, "employee": False}},
    {"key": "sales", "label": "Sales", "group": "Business",
     "roles": {"hr": False, "employee": False}},
    {"key": "inventory", "label": "Inventory", "group": "Business",
     "roles": {"hr": False, "employee": False}},

    {"key": "contacts", "label": "Contacts", "group": "Contacts",
     "roles": {"hr": True, "employee": True}},
    {"key": "companies", "label": "Companies", "group": "Contacts",
     "roles": {"hr": True, "employee": True}},

    {"key": "projects", "label": "Projects", "group": "Operations",
     "roles": {"hr": True, "employee": True}},
    {"key": "tasks", "label": "Tasks", "group": "Operations",
     "roles": {"hr": True, "employee": True}},
    {"key": "calendar", "label": "Calendar", "group": "Operations",
     "roles": {"hr": True, "employee": True}},
    {"key": "documents", "label": "Documents", "group": "Operations",
     "roles": {"hr": True, "employee": True}},

    {"key": "employees", "label": "HRMS / Employees", "group": "People",
     "roles": {"hr": True, "employee": False}},
    {"key": "attendance", "label": "Attendance", "group": "People",
     "roles": {"hr": True, "employee": True}},
    {"key": "leaves", "label": "Leaves", "group": "People",
     "roles": {"hr": True, "employee": True}},
    {"key": "payroll", "label": "Payroll", "group": "People",
     "roles": {"hr": True, "employee": True}},
    {"key": "targets", "label": "Targets", "group": "People",
     "roles": {"hr": True, "employee": True}},

    {"key": "finance", "label": "Finance", "group": "Finance",
     "roles": {"hr": False, "employee": False}},
    {"key": "expenses", "label": "Expenses", "group": "Finance",
     "roles": {"hr": False, "employee": False}},
    {"key": "reports", "label": "Reports", "group": "Finance",
     "roles": {"hr": False, "employee": False}},
    {"key": "invoices", "label": "Invoices", "group": "Finance",
     "roles": {"hr": False, "employee": False}},

    {"key": "chat", "label": "Messages / Chat", "group": "Communication",
     "roles": {"hr": True, "employee": True}},
    {"key": "ai", "label": "AI Assistant", "group": "Communication",
     "roles": {"hr": True, "employee": True}},
]

# Quick lookups
MODULE_KEYS = {m["key"] for m in FEATURE_MODULES}


def default_feature_access() -> Dict[str, Dict[str, bool]]:
    """Build the default {role: {module: bool}} matrix from the registry."""
    matrix: Dict[str, Dict[str, bool]] = {role: {} for role in CONFIGURABLE_ROLES}
    for m in FEATURE_MODULES:
        for role in CONFIGURABLE_ROLES:
            matrix[role][m["key"]] = bool(m["roles"].get(role, False))
    return matrix


def resolve_feature_access(stored: Dict) -> Dict[str, Dict[str, bool]]:
    """
    Merge an org's stored overrides on top of defaults so the response always
    contains every role/module, even for modules added after the org was created.
    """
    resolved = default_feature_access()
    stored = stored or {}
    for role in CONFIGURABLE_ROLES:
        role_overrides = stored.get(role) or {}
        for key in MODULE_KEYS:
            if key in role_overrides:
                resolved[role][key] = bool(role_overrides[key])
    return resolved


class FeatureAccessUpdate(BaseModel):
    """Admin payload: full or partial {role: {module: bool}} matrix."""
    feature_access: Dict[str, Dict[str, bool]]


class FeatureAccessResponse(BaseModel):
    modules: list
    configurable_roles: list
    feature_access: Dict[str, Dict[str, bool]]
