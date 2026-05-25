"""
Chat router — Full WhatsApp-style real-time messaging with typing, read receipts, online status.
"""

import logging
from typing import List, Dict, Optional, Set
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from beanie import PydanticObjectId
from beanie.operators import In
from pydantic import BaseModel

from models.user import User
from models.employee import Employee
from models.chat import ChatRoom, ChatMessage
from models.notification import Notification
from middleware.auth_middleware import get_current_user
from services.token_service import decode_access_token, is_token_blacklisted

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


# ── Pydantic schemas ────────────────────────────────────────────────
class CreateGroupRequest(BaseModel):
    name: str
    participant_ids: List[str]


class EditMessageRequest(BaseModel):
    content: str


# ── WebSocket Connection Manager ────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.online_users: Set[str] = set()

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        self.online_users.add(user_id)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.online_users.discard(user_id)

    async def send_to_user(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            dead = []
            for conn in self.active_connections[user_id]:
                try:
                    await conn.send_json(message)
                except Exception:
                    dead.append(conn)
            for d in dead:
                self.active_connections[user_id].remove(d)

    def is_online(self, user_id: str) -> bool:
        return user_id in self.online_users

manager = ConnectionManager()


# ── Helper ──────────────────────────────────────────────────────────
async def _build_user_lookup(participant_ids: list) -> dict:
    users = await User.find(In(User.id, participant_ids)).to_list()
    employees = await Employee.find(In(Employee.user_id, participant_ids)).to_list()
    lookup = {}
    for u in users:
        lookup[str(u.id)] = {"id": str(u.id), "name": u.full_name.strip() or u.email, "role": u.role, "avatar": u.avatar_url}
    for e in employees:
        if e.user_id:
            lookup[str(e.user_id)] = {"id": str(e.user_id), "name": e.name, "role": e.role or "employee", "avatar": e.avatar_url}
    return lookup


def _message_payload(message: ChatMessage, sender_name: str = "Unknown") -> dict:
    return {
        "id": str(message.id),
        "room_id": str(message.room_id),
        "sender_id": str(message.sender_id),
        "sender_name": sender_name,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
        "updated_at": message.updated_at.isoformat() if getattr(message, "updated_at", None) else None,
        "edited_at": message.edited_at.isoformat() if getattr(message, "edited_at", None) else None,
        "is_read": message.is_read,
        "reply_to_id": str(message.reply_to_id) if getattr(message, "reply_to_id", None) else None,
        "reply_to_content": None,
    }


async def _broadcast_to_room(room: ChatRoom, payload: dict):
    for pid in room.participants:
        await manager.send_to_user(payload, str(pid))


async def _refresh_room_last_message(room: ChatRoom):
    last_msg = await ChatMessage.find(ChatMessage.room_id == room.id).sort("-created_at").first_or_none()
    room.last_message_at = last_msg.created_at if last_msg else datetime.now(timezone.utc)
    room.updated_at = datetime.now(timezone.utc)
    await room.save()


def _aware_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


# ── REST Endpoints ──────────────────────────────────────────────────

@router.get("/users")
async def get_chat_users(current_user: User = Depends(get_current_user)):
    if current_user.role == "super_admin":
        users = await User.find(User.is_active == True).to_list()
        employees = await Employee.find(Employee.is_deleted != True).to_list()
    else:
        users = await User.find(User.org_id == current_user.org_id, User.is_active == True).to_list()
        employees = await Employee.find(Employee.org_id == current_user.org_id, Employee.is_deleted != True).to_list()

    result_map = {}
    for u in users:
        uid = str(u.id)
        result_map[uid] = {
            "id": uid, "user_id": uid,
            "name": u.full_name.strip() or u.email,
            "email": u.email, "role": u.role, "avatar": u.avatar_url,
            "online": manager.is_online(uid),
        }
    for e in employees:
        uid = str(e.user_id) if e.user_id else str(e.id)
        if uid in result_map:
            result_map[uid]["role"] = e.role or result_map[uid]["role"]
            result_map[uid]["avatar"] = e.avatar_url
            result_map[uid]["name"] = e.name
        else:
            result_map[uid] = {
                "id": str(e.id), "user_id": uid,
                "name": e.name, "email": e.email,
                "role": e.role or "employee", "avatar": e.avatar_url,
                "online": manager.is_online(uid),
            }
    return {"success": True, "data": list(result_map.values())}


@router.get("/online")
async def get_online_users(current_user: User = Depends(get_current_user)):
    """Return set of online user IDs."""
    return {"success": True, "data": list(manager.online_users)}


@router.get("/rooms")
async def get_chat_rooms(current_user: User = Depends(get_current_user)):
    rooms = await ChatRoom.find(In(ChatRoom.participants, [current_user.id])).sort("-last_message_at").to_list()

    all_pids = set()
    for r in rooms:
        for p in r.participants:
            all_pids.add(p)
    lookup = await _build_user_lookup(list(all_pids))

    result = []
    for room in rooms:
        last_msg = await ChatMessage.find(ChatMessage.room_id == room.id).sort("-created_at").first_or_none()

        # Count unread messages
        unread = await ChatMessage.find(
            ChatMessage.room_id == room.id,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.is_read == False
        ).count()

        rd = {
            "id": str(room.id),
            "room_type": room.room_type,
            "name": room.name,
            "participants": [str(p) for p in room.participants],
            "participants_details": [lookup.get(str(p), {"id": str(p), "name": "Unknown", "role": "unknown", "avatar": None}) for p in room.participants],
            "last_message_at": room.last_message_at.isoformat() if room.last_message_at else None,
            "last_message": last_msg.content[:80] if last_msg else None,
            "last_message_sender": str(last_msg.sender_id) if last_msg else None,
            "unread_count": unread,
        }
        result.append(rd)
    return {"success": True, "data": result}


@router.post("/rooms/direct/{target_user_id}")
async def get_or_create_direct_room(target_user_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    if current_user.id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")

    target_user = await User.get(target_user_id)
    target_org_id = None
    if target_user:
        target_org_id = target_user.org_id
    else:
        emp = await Employee.get(target_user_id)
        if not emp:
            raise HTTPException(status_code=404, detail="User not found")
        target_org_id = emp.org_id

    existing = await ChatRoom.find(ChatRoom.room_type == "direct", In(ChatRoom.participants, [current_user.id])).to_list()
    for room in existing:
        if target_user_id in room.participants and len(room.participants) == 2:
            return {"success": True, "data": {"id": str(room.id)}}

    new_room = ChatRoom(
        org_id=current_user.org_id or target_org_id,
        participants=[current_user.id, target_user_id],
        room_type="direct"
    )
    await new_room.insert()
    return {"success": True, "data": {"id": str(new_room.id)}}


@router.post("/rooms/group")
async def create_group_room(body: CreateGroupRequest, current_user: User = Depends(get_current_user)):
    pids = [PydanticObjectId(p) for p in body.participant_ids if p != str(current_user.id)]
    pids.insert(0, current_user.id)
    if len(pids) < 2:
        raise HTTPException(status_code=400, detail="A group needs at least 2 members")

    new_room = ChatRoom(
        org_id=current_user.org_id,
        participants=pids,
        room_type="group",
        name=body.name.strip() or "New Group"
    )
    await new_room.insert()
    return {"success": True, "data": {"id": str(new_room.id)}}


@router.get("/messages/{room_id}")
async def get_messages(room_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    room = await ChatRoom.get(room_id)
    if not room or current_user.id not in room.participants:
        raise HTTPException(status_code=404, detail="Room not found or access denied")

    msgs = await ChatMessage.find(ChatMessage.room_id == room_id).sort("created_at").to_list()
    lookup = await _build_user_lookup(list({m.sender_id for m in msgs}))

    result = []
    for m in msgs:
        sender = lookup.get(str(m.sender_id), {"name": "Unknown"})
        result.append(_message_payload(m, sender["name"]))

    # Populate reply previews
    reply_ids = [r["reply_to_id"] for r in result if r["reply_to_id"]]
    if reply_ids:
        reply_msgs = await ChatMessage.find(In(ChatMessage.id, [PydanticObjectId(x) for x in reply_ids])).to_list()
        reply_map = {str(rm.id): rm.content[:60] for rm in reply_msgs}
        for r in result:
            if r["reply_to_id"] and r["reply_to_id"] in reply_map:
                r["reply_to_content"] = reply_map[r["reply_to_id"]]

    return {"success": True, "data": result}


# ── WebSocket ───────────────────────────────────────────────────────

@router.patch("/messages/{message_id}")
async def edit_message(message_id: PydanticObjectId, body: EditMessageRequest, current_user: User = Depends(get_current_user)):
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = await ChatMessage.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    room = await ChatRoom.get(msg.room_id)
    if not room or current_user.id not in room.participants:
        raise HTTPException(status_code=404, detail="Room not found or access denied")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can edit only your own messages")
    if datetime.now(timezone.utc) - _aware_utc(msg.created_at) > timedelta(minutes=5):
        raise HTTPException(status_code=400, detail="Messages can only be edited within 5 minutes")

    msg.content = content
    msg.edited_at = datetime.now(timezone.utc)
    msg.updated_at = msg.edited_at
    await msg.save()

    sender_name = current_user.full_name.strip() or current_user.email
    payload = {"type": "message_edited", "data": _message_payload(msg, sender_name)}
    await _broadcast_to_room(room, payload)
    return {"success": True, "data": payload["data"], "message": "Message edited"}


@router.delete("/messages/{message_id}")
async def delete_message(message_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    msg = await ChatMessage.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    room = await ChatRoom.get(msg.room_id)
    if not room or current_user.id not in room.participants:
        raise HTTPException(status_code=404, detail="Room not found or access denied")
    if msg.sender_id != current_user.id and current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="You can delete only your own messages")

    room_id = str(room.id)
    await msg.delete()
    await _refresh_room_last_message(room)
    await _broadcast_to_room(room, {
        "type": "message_deleted",
        "data": {"id": str(message_id), "room_id": room_id}
    })
    return {"success": True, "message": "Message deleted"}


@router.delete("/rooms/{room_id}")
async def delete_room(room_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    room = await ChatRoom.get(room_id)
    if not room or current_user.id not in room.participants:
        raise HTTPException(status_code=404, detail="Room not found or access denied")

    participant_ids = [str(pid) for pid in room.participants]
    await ChatMessage.find(ChatMessage.room_id == room_id).delete()
    await room.delete()
    for pid in participant_ids:
        await manager.send_to_user({
            "type": "room_deleted",
            "data": {"room_id": str(room_id)}
        }, pid)
    return {"success": True, "message": "Chat deleted"}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_access_token(token)
        jti = payload.get("jti")
        if jti and await is_token_blacklisted(jti):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION); return
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION); return
        user = await User.get(PydanticObjectId(user_id))
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION); return
    except Exception as e:
        logger.error(f"WS Auth failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION); return

    uid = str(user.id)
    await manager.connect(websocket, uid)

    # Broadcast online status to all rooms the user is in
    user_rooms = await ChatRoom.find(In(ChatRoom.participants, [user.id])).to_list()
    notified_users = set()
    for room in user_rooms:
        for pid in room.participants:
            spid = str(pid)
            if spid != uid and spid not in notified_users:
                await manager.send_to_user({"type": "user_online", "data": {"user_id": uid}}, spid)
                notified_users.add(spid)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "send_message":
                room_id_str = data.get("room_id")
                content = data.get("content", "").strip()
                reply_to = data.get("reply_to_id")
                if not room_id_str or not content:
                    continue

                room_id = PydanticObjectId(room_id_str)
                room = await ChatRoom.get(room_id)
                if not room or user.id not in room.participants:
                    continue

                new_msg = ChatMessage(room_id=room_id, sender_id=user.id, content=content, org_id=user.org_id)
                if reply_to:
                    new_msg.reply_to_id = PydanticObjectId(reply_to)
                await new_msg.insert()

                # Notify other participants in the room
                try:
                    for pid in room.participants:
                        if pid != user.id:
                            notif = Notification(
                                org_id=user.org_id,
                                user_id=pid,
                                created_by=user.id,
                                type="new_message",
                                title=f"New message in {room.name}" if room.room_type == "group" else f"New message from {user.full_name or user.email}",
                                message=content[:100],
                                entity_type="chat",
                                entity_id=room.id,
                            )
                            await notif.insert()
                except Exception:
                    pass

                room.last_message_at = datetime.now(timezone.utc)
                await room.save()

                sender_name = user.full_name.strip() or user.email

                # Get reply preview if replying
                reply_content = None
                if reply_to:
                    orig = await ChatMessage.get(PydanticObjectId(reply_to))
                    if orig:
                        reply_content = orig.content[:60]

                broadcast = {
                    "type": "new_message",
                    "data": {
                        "id": str(new_msg.id),
                        "room_id": str(room_id),
                        "sender_id": uid,
                        "sender_name": sender_name,
                        "content": content,
                        "created_at": new_msg.created_at.isoformat(),
                        "updated_at": new_msg.updated_at.isoformat() if new_msg.updated_at else None,
                        "edited_at": None,
                        "is_read": False,
                        "reply_to_id": reply_to,
                        "reply_to_content": reply_content,
                    }
                }
                await _broadcast_to_room(room, broadcast)

            elif action == "typing":
                room_id_str = data.get("room_id")
                if not room_id_str:
                    continue
                room_id = PydanticObjectId(room_id_str)
                room = await ChatRoom.get(room_id)
                if not room or user.id not in room.participants:
                    continue
                sender_name = user.full_name.strip() or user.email
                for pid in room.participants:
                    spid = str(pid)
                    if spid != uid:
                        await manager.send_to_user({
                            "type": "typing",
                            "data": {"room_id": room_id_str, "user_id": uid, "user_name": sender_name}
                        }, spid)

            elif action == "mark_read":
                room_id_str = data.get("room_id")
                if not room_id_str:
                    continue
                room_id = PydanticObjectId(room_id_str)
                # Mark all messages in this room from other senders as read
                await ChatMessage.find(
                    ChatMessage.room_id == room_id,
                    ChatMessage.sender_id != user.id,
                    ChatMessage.is_read == False
                ).update_many({"$set": {"is_read": True}})

                # Notify senders that their messages were read
                room = await ChatRoom.get(room_id)
                if room:
                    for pid in room.participants:
                        spid = str(pid)
                        if spid != uid:
                            await manager.send_to_user({
                                "type": "messages_read",
                                "data": {"room_id": room_id_str, "reader_id": uid}
                            }, spid)

    except WebSocketDisconnect:
        manager.disconnect(websocket, uid)
        # Broadcast offline status
        for room in user_rooms:
            for pid in room.participants:
                spid = str(pid)
                if spid != uid:
                    await manager.send_to_user({"type": "user_offline", "data": {"user_id": uid}}, spid)
    except Exception as e:
        logger.error(f"WS error: {e}")
        manager.disconnect(websocket, uid)
