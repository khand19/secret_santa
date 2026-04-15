from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
from ..database import get_db
from ..models import User
import json, uuid
from datetime import datetime, timedelta

router = APIRouter(prefix="/qwixx", tags=["qwixx"])

# ─── In-memory state (éphémère, pas besoin de BDD) ───────────────────────────

rooms: Dict[str, dict] = {}          # code -> room
connections: Dict[str, Dict[str, WebSocket]] = {}   # code -> {uid_str: ws}

EMPTY_SHEET = {
    "rows": {
        "red":    [False]*12,
        "yellow": [False]*12,
        "green":  [False]*12,
        "blue":   [False]*12,
    },
    "penalties": [False]*4,
}

def cleanup_rooms():
    cutoff = datetime.utcnow() - timedelta(hours=12)
    to_del = [k for k, v in rooms.items() if v["created_at"] < cutoff]
    for k in to_del:
        rooms.pop(k, None)
        connections.pop(k, None)

def get_locked_rows(room: dict) -> List[str]:
    """Lignes verrouillées par au moins un joueur."""
    locked = set()
    for player in room["players"].values():
        for color in ["red", "yellow", "green", "blue"]:
            if player["sheet"]["rows"][color][11]:
                locked.add(color)
    return list(locked)

def check_game_over(room: dict, locked_rows: List[str]) -> bool:
    """Partie terminée : 2 lignes verrouillées OU un joueur a 4 pénalités."""
    if len(locked_rows) >= 2:
        return True
    for player in room["players"].values():
        if sum(player["sheet"]["penalties"]) >= 4:
            return True
    return False

async def broadcast(code: str):
    room = rooms.get(code)
    if not room:
        return
    locked_rows = get_locked_rows(room)
    game_over = check_game_over(room, locked_rows)
    msg = json.dumps({
        "type": "state",
        "code": code,
        "players": list(room["players"].values()),
        "locked_rows": locked_rows,
        "game_over": game_over,
    }, default=str)
    dead = []
    for uid, ws in list(connections.get(code, {}).items()):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(uid)
    for uid in dead:
        connections.get(code, {}).pop(uid, None)
        if uid in rooms.get(code, {}).get("players", {}):
            rooms[code]["players"][uid]["connected"] = False

# ─── HTTP ─────────────────────────────────────────────────────────────────────

@router.post("/rooms")
async def create_room(db: Session = Depends(get_db)):
    # Auth via session — handled at WS level; HTTP endpoint needs session too
    cleanup_rooms()
    code = uuid.uuid4().hex[:6].upper()
    rooms[code] = {"code": code, "created_at": datetime.utcnow(), "players": {}}
    return {"code": code}

@router.get("/rooms/{code}")
async def check_room(code: str):
    room = rooms.get(code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Partie introuvable")
    locked_rows = get_locked_rows(room)
    game_over = check_game_over(room, locked_rows)
    return {
        "code": code.upper(),
        "player_count": len(room["players"]),
        "locked_rows": locked_rows,
        "game_over": game_over,
    }

# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/rooms/{code}/ws")
async def ws_endpoint(websocket: WebSocket, code: str, db: Session = Depends(get_db)):
    code = code.upper()

    # Auth via session cookie
    user_id = websocket.session.get("user_id")
    if not user_id:
        await websocket.close(code=4001)
        return

    if code not in rooms:
        await websocket.close(code=4004)
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    uid = str(user_id)

    if code not in connections:
        connections[code] = {}
    connections[code][uid] = websocket

    # Enregistre le joueur (ou reconnecte)
    if uid not in rooms[code]["players"]:
        rooms[code]["players"][uid] = {
            "user_id": user_id,
            "name": user.nickname or f"{user.first_name} {user.last_name}",
            "avatar": user.profile_image,
            "sheet": json.loads(json.dumps(EMPTY_SHEET)),  # deep copy
            "connected": True,
        }
    else:
        rooms[code]["players"][uid]["connected"] = True

    await broadcast(code)

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "update" and uid in rooms[code]["players"]:
                rooms[code]["players"][uid]["sheet"] = data["sheet"]
                await broadcast(code)

    except WebSocketDisconnect:
        connections.get(code, {}).pop(uid, None)
        if uid in rooms.get(code, {}).get("players", {}):
            rooms[code]["players"][uid]["connected"] = False
        await broadcast(code)
