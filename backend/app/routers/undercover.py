from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
from ..database import get_db
from ..models import User
import json, uuid, random
from datetime import datetime, timedelta

router = APIRouter(prefix="/undercover", tags=["undercover"])

# ─── In-memory state ──────────────────────────────────────────────────────────

rooms: Dict[str, dict] = {}
connections: Dict[str, Dict[str, WebSocket]] = {}

def cleanup_rooms():
    cutoff = datetime.utcnow() - timedelta(hours=12)
    to_del = [k for k, v in rooms.items() if v["created_at"] < cutoff]
    for k in to_del:
        rooms.pop(k, None)
        connections.pop(k, None)

async def broadcast_public(code: str):
    """Diffuse l'état public (sans rôles des autres joueurs)."""
    room = rooms.get(code)
    if not room:
        return

    msg = json.dumps({
        "type": "state",
        "status": room["status"],
        "round": room.get("round", 0),
        "players": [
            {
                "user_id": p["user_id"],
                "name": p["name"],
                "avatar": p["avatar"],
                "connected": p["connected"],
                "eliminated": p.get("eliminated", False),
            }
            for p in room["players"].values()
        ],
        "order": room.get("order", []),
        "result": room.get("result"),
    }, default=str)

    dead = []
    for uid, ws in list(connections.get(code, {}).items()):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(uid)

    for uid in dead:
        connections.get(code, {}).pop(uid, None)
        if uid in room.get("players", {}):
            room["players"][uid]["connected"] = False

async def send_role_to_player(code: str, uid: str):
    """Envoie le rôle et le mot civil au joueur (message privé)."""
    room = rooms.get(code)
    if not room or uid not in room["players"]:
        return

    player = room["players"][uid]
    role = player.get("role")

    msg = json.dumps({
        "type": "role",
        "role": role,
        "word_civil": room.get("word_civil"),
        "word_undercover": room.get("word_undercover"),
    })

    ws = connections.get(code, {}).get(uid)
    if ws:
        try:
            await ws.send_text(msg)
        except Exception:
            pass

async def assign_roles(code: str):
    """Attribue les rôles aléatoirement."""
    room = rooms.get(code)
    if not room:
        return

    player_uids = list(room["players"].keys())
    nb_players = len(player_uids)
    nb_undercover = room["nb_undercover"]
    mr_white_enabled = room["mr_white_enabled"]

    roles = ["civil"] * (nb_players - nb_undercover - (1 if mr_white_enabled else 0))
    roles += ["undercover"] * nb_undercover
    if mr_white_enabled:
        roles.append("mrwhite")

    random.shuffle(roles)

    for uid, role in zip(player_uids, roles):
        room["players"][uid]["role"] = role
        room["players"][uid]["eliminated"] = False

async def check_game_over(code: str) -> dict | None:
    """Vérifie si le jeu est terminé et retourne le résultat."""
    room = rooms.get(code)
    if not room:
        return None

    alive = [p for p in room["players"].values() if not p.get("eliminated")]

    undercovers = [p for p in alive if p.get("role") == "undercover"]
    mrwhites = [p for p in alive if p.get("role") == "mrwhite"]
    civils = [p for p in alive if p.get("role") == "civil"]

    # Civils gagnent : tous undercover et mrwhite éliminés
    if not undercovers and not mrwhites:
        return {"winner": "civils", "winners": civils, "losers": [p for p in room["players"].values() if p.get("eliminated") or p in undercovers + mrwhites]}

    # Undercover/Mr. White gagnent : ≤ 2 joueurs restants (dont au moins 1 undercover/mrwhite)
    if len(alive) <= 2 and (undercovers or mrwhites):
        return {"winner": "undercover", "winners": undercovers + mrwhites, "losers": civils}

    return None

# ─── HTTP ─────────────────────────────────────────────────────────────────────

@router.post("/rooms")
async def create_room(db: Session = Depends(get_db)):
    cleanup_rooms()
    code = uuid.uuid4().hex[:6].upper()
    rooms[code] = {
        "code": code,
        "created_at": datetime.utcnow(),
        "status": "lobby",
        "players": {},
        "word_civil": "",
        "word_undercover": "",
        "mr_white_enabled": False,
        "nb_undercover": 1,
    }
    return {"code": code}

@router.get("/rooms/{code}")
async def check_room(code: str):
    room = rooms.get(code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Partie introuvable")
    return {
        "code": code.upper(),
        "status": room["status"],
        "player_count": len(room["players"]),
    }

# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/rooms/{code}/ws")
async def ws_endpoint(websocket: WebSocket, code: str, db: Session = Depends(get_db)):
    code = code.upper()

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
    room = rooms[code]

    if code not in connections:
        connections[code] = {}
    connections[code][uid] = websocket

    # Enregistre le joueur
    if uid not in room["players"]:
        room["players"][uid] = {
            "user_id": user_id,
            "name": user.nickname or f"{user.first_name} {user.last_name}",
            "avatar": user.profile_image,
            "role": None,
            "connected": True,
            "eliminated": False,
        }
    else:
        room["players"][uid]["connected"] = True

    await broadcast_public(code)

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "start":
                # Hôte démarre la partie
                room["word_civil"] = data.get("word_civil")
                room["word_undercover"] = data.get("word_undercover")
                room["mr_white_enabled"] = data.get("mr_white_enabled", False)
                room["nb_undercover"] = data.get("nb_undercover", 1)
                room["status"] = "playing"
                room["round"] = 1

                await assign_roles(code)

                # Envoyer les rôles à chaque joueur
                for player_uid in room["players"].keys():
                    await send_role_to_player(code, player_uid)

                await broadcast_public(code)

            elif data.get("type") == "eliminate":
                # L'hôte élimine un joueur
                target_uid = data.get("target_uid")
                if target_uid in room["players"]:
                    room["players"][target_uid]["eliminated"] = True

                    # Vérifier fin de jeu
                    result = await check_game_over(code)
                    if result:
                        room["status"] = "finished"
                        room["result"] = result
                    else:
                        room["round"] = room.get("round", 1) + 1

                    await broadcast_public(code)

            elif data.get("type") == "mr_white_guess":
                # Mr. White essaie de deviner
                guess = data.get("word")
                correct = guess.lower().strip() == room.get("word_civil", "").lower().strip()

                if correct:
                    # Mr. White gagne
                    mrwhite_uid = uid
                    room["status"] = "finished"
                    room["result"] = {
                        "winner": "mrwhite",
                        "winners": [room["players"][mrwhite_uid]],
                    }
                else:
                    # Mr. White éliminé (déjà marqué avant cette tentative)
                    result = await check_game_over(code)
                    if result:
                        room["status"] = "finished"
                        room["result"] = result

                await broadcast_public(code)

    except WebSocketDisconnect:
        connections.get(code, {}).pop(uid, None)
        if uid in room.get("players", {}):
            room["players"][uid]["connected"] = False
        await broadcast_public(code)
