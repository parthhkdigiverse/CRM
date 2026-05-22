#!/usr/bin/env python3
"""Migration script: normalize avatar URLs to use BACKEND_URL

Usage: python backend/scripts/migrate_avatars.py
"""
import asyncio
import os
import sys
from urllib.parse import urlparse, urlunparse

# Ensure backend folder is on sys.path when executed from project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import init_db, close_db
from models.user import User
from models.employee import Employee
from config import settings


def normalize_avatar_url(url: str) -> str:
    if not url:
        return url
    parsed = urlparse(url)
    # If it's already relative (starts with /storage), prefix backend
    if parsed.scheme == "" and url.startswith("/storage/"):
        return f"{settings.BACKEND_URL}{url}"

    # If path targets storage avatars but host differs from backend, replace host
    if "/storage/avatars/" in parsed.path:
        backend = urlparse(settings.BACKEND_URL)
        # preserve scheme from BACKEND_URL (usually http) and use its netloc
        new = parsed._replace(scheme=backend.scheme or parsed.scheme, netloc=backend.netloc or parsed.netloc)
        return urlunparse(new)

    # Otherwise leave as-is
    return url


async def run():
    await init_db()
    try:
        users = await User.find(User.avatar_url != None).to_list()
        emp = await Employee.find(Employee.avatar_url != None).to_list()

        user_updates = 0
        for u in users:
            old = u.avatar_url
            new = normalize_avatar_url(old)
            if new != old:
                u.avatar_url = new
                await u.save()
                user_updates += 1

        emp_updates = 0
        for e in emp:
            old = e.avatar_url
            new = normalize_avatar_url(old)
            if new != old:
                e.avatar_url = new
                await e.save()
                emp_updates += 1

        print(f"Users scanned: {len(users)}, updated: {user_updates}")
        print(f"Employees scanned: {len(emp)}, updated: {emp_updates}")
    finally:
        await close_db()


if __name__ == '__main__':
    asyncio.run(run())
