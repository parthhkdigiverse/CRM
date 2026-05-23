"""
Authentication routes — local auth, Google OAuth, password reset, email verification.
"""

from fastapi import APIRouter, Depends, Request, Response, status, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse

from middleware.auth_middleware import get_current_user
from middleware.rate_limiter import rate_limit
from models.user import User
from models.employee import Employee
from schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    VerifyEmailRequest,
    ProfileUpdateRequest,
)
from schemas.common import SuccessResponse
from services import auth_service
from services import oauth_service
from services.audit_service import log_action
from utils.helpers import utc_now
from utils.file_validation import validate_upload

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _is_secure_request(request: Request) -> bool:
    """Check if the incoming request is over HTTPS (directly or via proxy)."""
    if request.url.scheme == "https":
        return True
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    return forwarded_proto.lower() == "https"


@router.post("/register", response_model=SuccessResponse, dependencies=[Depends(rate_limit(5, 60))])
async def register(data: RegisterRequest):
    """Register a new user account."""
    try:
        user = await auth_service.register_user(data)
        # We don't log registration to audit log until they verify, or we could.
        return SuccessResponse(message="Registration successful. Please check your email for the verification code.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verify-email", response_model=SuccessResponse, dependencies=[Depends(rate_limit(10, 60))])
async def verify_email(data: VerifyEmailRequest):
    """Verify user's email with OTP."""
    try:
        await auth_service.verify_email(data.email, data.otp)
        return SuccessResponse(message="Email verified successfully. You can now log in.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=SuccessResponse, dependencies=[Depends(rate_limit(10, 60))])
async def login(data: LoginRequest, request: Request, response: Response):
    """Authenticate user and return access token + set refresh token in cookie."""
    try:
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        user, access_token, refresh_token = await auth_service.login_user(
            data.email, data.password, data.remember_me, ip, user_agent
        )

        # Set HTTP-only cookie for refresh token
        is_secure = _is_secure_request(request)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=30 * 24 * 60 * 60 if data.remember_me else 7 * 24 * 60 * 60,
        )

        return SuccessResponse(
            data={
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "role": user.role,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "org_id": str(user.org_id) if user.org_id else None,
                    "avatar_url": user.avatar_url,
                }
            },
            message="Login successful"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=SuccessResponse)
async def refresh(request: Request, response: Response):
    """Refresh access token using refresh token cookie."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token provided")

    try:
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        new_access, new_refresh = await auth_service.refresh_access_token(refresh_token, ip, user_agent)

        # Update cookie
        is_secure = _is_secure_request(request)
        response.set_cookie(
            key="refresh_token",
            value=new_refresh,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=7 * 24 * 60 * 60,  # Default 7 days on refresh
        )

        return SuccessResponse(data={"access_token": new_access, "token_type": "bearer"})
    except ValueError as e:
        # Clear invalid cookie
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=SuccessResponse)
async def logout(request: Request, response: Response):
    """Log out user by revoking refresh token."""
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        await auth_service.logout_user(refresh_token)
        response.delete_cookie("refresh_token")
    return SuccessResponse(message="Logged out successfully")


@router.get("/google/url", response_model=SuccessResponse)
async def get_google_url():
    """Get Google OAuth URL."""
    try:
        url = oauth_service.get_google_auth_url()
        return SuccessResponse(data={"url": url})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/google/callback")
async def google_callback(code: str, request: Request, response: Response):
    """Handle Google OAuth callback and redirect to frontend."""
    try:
        user, access_token, refresh_token = await oauth_service.handle_google_callback(code)

        # Set cookie
        is_secure = _is_secure_request(request)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=7 * 24 * 60 * 60,
        )

        # Do not place bearer tokens in URLs. The frontend can call /refresh using the secure cookie.
        from config import settings
        frontend_url = f"{settings.FRONTEND_URL}/oauth/callback"
        return RedirectResponse(url=frontend_url)
    except ValueError as e:
        # Redirect to frontend with error
        from config import settings
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")


@router.post("/forgot-password", response_model=SuccessResponse, dependencies=[Depends(rate_limit(3, 60))])
async def forgot_password(data: ForgotPasswordRequest):
    """Send password reset email."""
    # Always return success to prevent email enumeration
    await auth_service.forgot_password(data.email)
    return SuccessResponse(message="If your email is registered, a reset link has been sent.")


@router.post("/reset-password", response_model=SuccessResponse, dependencies=[Depends(rate_limit(5, 60))])
async def reset_password(data: ResetPasswordRequest):
    """Reset password using token."""
    try:
        await auth_service.reset_password(data.token, data.new_password)
        return SuccessResponse(message="Password reset successfully. You can now log in.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user)
):
    """Change password for authenticated user."""
    try:
        await auth_service.change_password(str(current_user.id), data.current_password, data.new_password)
        await log_action(
            str(current_user.org_id) if current_user.org_id else "",
            str(current_user.id),
            "update",
            "users",
            str(current_user.id),
            {"field": "password", "changed": True}
        )
        return SuccessResponse(message="Password changed successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me", response_model=SuccessResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return SuccessResponse(data={
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "org_id": str(current_user.org_id) if current_user.org_id else None,
        "avatar_url": current_user.avatar_url,
        "timezone": current_user.timezone,
    })


@router.put("/me", response_model=SuccessResponse)
async def update_me(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update current user profile."""
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(current_user, k, v)
    current_user.updated_at = utc_now()
    await current_user.save()
    
    # Sync with employee record if it exists
    employee = await Employee.find_one(Employee.user_id == current_user.id)
    if employee:
        employee_updated = False
        if "first_name" in update_data or "last_name" in update_data:
            employee.name = f"{current_user.first_name} {current_user.last_name}".strip()
            employee_updated = True
        if "email" in update_data:
            employee.email = current_user.email
            employee_updated = True
        if "phone" in update_data:
            employee.phone = current_user.phone
            employee_updated = True
        if employee_updated:
            await employee.save()
    
    await log_action(
        str(current_user.org_id) if current_user.org_id else "",
        str(current_user.id),
        "update",
        "users",
        str(current_user.id),
        update_data
    )
    
    return SuccessResponse(message="Profile updated successfully")


@router.post("/me/avatar", response_model=SuccessResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload user avatar image."""
    import os
    import asyncio
    import secrets
    from config import settings
    
    avatar_dir = os.path.join(os.getcwd(), "storage", "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    
    upload = await validate_upload(file, allow_images_only=True)
    file_name = f"{current_user.id}_{int(utc_now().timestamp())}_{secrets.token_hex(8)}.{upload.extension}"
    file_path = os.path.join(avatar_dir, file_name)

    async def write_avatar() -> None:
        with open(file_path, "wb") as buffer:
            while content := await file.read(1024 * 1024):
                buffer.write(content)

    try:
        await write_avatar()
    except Exception:
        if os.path.exists(file_path):
            await asyncio.to_thread(os.remove, file_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save avatar")
        
    avatar_url = f"{settings.BACKEND_URL}/storage/avatars/{file_name}"
    
    current_user.avatar_url = avatar_url
    current_user.updated_at = utc_now()
    await current_user.save()
    
    # Sync avatar with employee record if it exists
    employee = await Employee.find_one(Employee.user_id == current_user.id)
    if employee:
        employee.avatar_url = avatar_url
        await employee.save()
    
    await log_action(
        str(current_user.org_id) if current_user.org_id else "",
        str(current_user.id),
        "update",
        "users",
        str(current_user.id),
        {"field": "avatar_url"}
    )
    
    return SuccessResponse(message="Avatar uploaded successfully", data={"avatar_url": avatar_url})
