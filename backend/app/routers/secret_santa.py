from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import (
    User, WishItem,
    SecretSanta, SecretSantaParticipant, SecretSantaExclusion,
)
from ..schemas import (
    SecretSantaResponse, SecretSantaDetailResponse,
    SantaParticipantResponse, MyAssignmentResponse,
    SantaUserInfo, WishItemResponse,
)
from ..dependencies import get_current_user, get_admin_user
from ..draw import draw_secret_santa
from ..email import send_santa_result

admin_router = APIRouter(prefix="/admin/santas", tags=["admin-santa"])
user_router = APIRouter(prefix="/santas", tags=["santa"])


def _build_detail(santa: SecretSanta, include_wishlist: bool = True) -> dict:
    participants = []
    for p in santa.participants:
        wishlist = None
        if include_wishlist and p.assigned_to_id:
            wishlist = [WishItemResponse.model_validate(w) for w in p.assigned_to.wish_items]
        participants.append(
            SantaParticipantResponse(
                id=p.id,
                user=SantaUserInfo.model_validate(p.user),
                assigned_to=SantaUserInfo.model_validate(p.assigned_to) if p.assigned_to else None,
                assigned_to_wishlist=wishlist,
            )
        )
    return {
        "id": santa.id,
        "name": santa.name,
        "description": santa.description,
        "status": santa.status,
        "participants": participants,
        "exclusions": santa.exclusions,
        "based_on_id": santa.based_on_id,
        "based_on_name": santa.based_on.name if santa.based_on else None,
        "created_at": santa.created_at,
    }


def _collect_history_exclusions(santa: SecretSanta) -> dict:
    """Remonte la chaîne based_on et collecte tous les anciens tirages comme exclusions."""
    exclusions: dict = {}
    current = santa.based_on
    visited = set()
    while current and current.id not in visited:
        visited.add(current.id)
        for p in current.participants:
            if p.assigned_to_id:
                exclusions.setdefault(p.user_id, set()).add(p.assigned_to_id)
        current = current.based_on
    return exclusions


# ─── Admin routes ─────────────────────────────────────────────────────────────

@admin_router.get("", response_model=List[SecretSantaResponse])
def list_santas(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    santas = db.query(SecretSanta).order_by(SecretSanta.created_at.desc()).all()
    result = []
    for s in santas:
        result.append(SecretSantaResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            status=s.status,
            participant_count=len(s.participants),
            based_on_id=s.based_on_id,
            based_on_name=s.based_on.name if s.based_on else None,
            created_at=s.created_at,
        ))
    return result


@admin_router.post("", response_model=SecretSantaResponse, status_code=201)
def create_santa(
    name: str,
    description: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    santa = SecretSanta(name=name, description=description or None)
    db.add(santa)
    db.commit()
    db.refresh(santa)
    return SecretSantaResponse(
        id=santa.id, name=santa.name, description=santa.description,
        status=santa.status, participant_count=0, created_at=santa.created_at,
    )


@admin_router.get("/{santa_id}", response_model=SecretSantaDetailResponse)
def get_santa(santa_id: int, db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    santa = db.query(SecretSanta).filter(SecretSanta.id == santa_id).first()
    if not santa:
        raise HTTPException(status_code=404, detail="Secret Santa introuvable")
    return SecretSantaDetailResponse(**_build_detail(santa))


@admin_router.delete("/{santa_id}", status_code=204)
def delete_santa(santa_id: int, db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    santa = db.query(SecretSanta).filter(SecretSanta.id == santa_id).first()
    if not santa:
        raise HTTPException(status_code=404, detail="Secret Santa introuvable")
    db.delete(santa)
    db.commit()


@admin_router.post("/{santa_id}/participants", response_model=SecretSantaDetailResponse)
def add_participant(
    santa_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    santa = db.query(SecretSanta).filter(SecretSanta.id == santa_id).first()
    if not santa:
        raise HTTPException(status_code=404, detail="Secret Santa introuvable")
    if santa.status == "drawn":
        raise HTTPException(status_code=400, detail="Le tirage a déjà été effectué")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    already = any(p.user_id == user_id for p in santa.participants)
    if already:
        raise HTTPException(status_code=400, detail="Déjà participant")

    db.add(SecretSantaParticipant(santa_id=santa_id, user_id=user_id))
    db.commit()
    db.refresh(santa)
    return SecretSantaDetailResponse(**_build_detail(santa))


@admin_router.delete("/{santa_id}/participants/{user_id}", response_model=SecretSantaDetailResponse)
def remove_participant(
    santa_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    santa = db.query(SecretSanta).filter(SecretSanta.id == santa_id).first()
    if not santa:
        raise HTTPException(status_code=404, detail="Secret Santa introuvable")
    if santa.status == "drawn":
        raise HTTPException(status_code=400, detail="Le tirage a déjà été effectué")

    p = db.query(SecretSantaParticipant).filter_by(santa_id=santa_id, user_id=user_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Participant introuvable")
    db.delete(p)
    # Supprimer les exclusions liées à cet utilisateur dans ce santa
    db.query(SecretSantaExclusion).filter(
        SecretSantaExclusion.santa_id == santa_id,
        (SecretSantaExclusion.user_id == user_id) | (SecretSantaExclusion.excluded_user_id == user_id),
    ).delete(synchronize_session=False)
    db.commit()
    db.refresh(santa)
    return SecretSantaDetailResponse(**_build_detail(santa))


@admin_router.post("/{santa_id}/exclusions", response_model=SecretSantaDetailResponse)
def add_exclusion(
    santa_id: int,
    user_id: int,
    excluded_user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    santa = db.query(SecretSanta).filter(SecretSanta.id == santa_id).first()
    if not santa:
        raise HTTPException(status_code=404, detail="Secret Santa introuvable")
    if santa.status == "drawn":
        raise HTTPException(status_code=400, detail="Le tirage a déjà été effectué")
    if user_id == excluded_user_id:
        raise HTTPException(status_code=400, detail="Les deux utilisateurs doivent être différents")

    participant_ids = {p.user_id for p in santa.participants}
    if user_id not in participant_ids or excluded_user_id not in participant_ids:
        raise HTTPException(status_code=400, detail="Les deux utilisateurs doivent être participants")

    already = db.query(SecretSantaExclusion).filter_by(
        santa_id=santa_id, user_id=user_id, excluded_user_id=excluded_user_id
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="Cette exclusion existe déjà")

    db.add(SecretSantaExclusion(santa_id=santa_id, user_id=user_id, excluded_user_id=excluded_user_id))
    db.commit()
    db.refresh(santa)
    return SecretSantaDetailResponse(**_build_detail(santa))


@admin_router.delete("/{santa_id}/exclusions/{exclusion_id}", response_model=SecretSantaDetailResponse)
def remove_exclusion(
    santa_id: int,
    exclusion_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    santa = db.query(SecretSanta).filter(SecretSanta.id == santa_id).first()
    if not santa:
        raise HTTPException(status_code=404, detail="Secret Santa introuvable")

    exc = db.query(SecretSantaExclusion).filter_by(id=exclusion_id, santa_id=santa_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exclusion introuvable")
    db.delete(exc)
    db.commit()
    db.refresh(santa)
    return SecretSantaDetailResponse(**_build_detail(santa))


@admin_router.post("/{santa_id}/draw", response_model=SecretSantaDetailResponse)
def do_draw(
    santa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    santa = db.query(SecretSanta).filter(SecretSanta.id == santa_id).first()
    if not santa:
        raise HTTPException(status_code=404, detail="Secret Santa introuvable")
    if santa.status == "drawn":
        raise HTTPException(status_code=400, detail="Le tirage a déjà été effectué")
    if len(santa.participants) < 2:
        raise HTTPException(status_code=400, detail="Il faut au moins 2 participants")

    participant_ids = [p.user_id for p in santa.participants]

    # Exclusions permanentes
    exclusions: dict = {}
    for exc in santa.exclusions:
        exclusions.setdefault(exc.user_id, set()).add(exc.excluded_user_id)

    # Exclusions historiques (anciens tirages)
    history_exclusions = _collect_history_exclusions(santa)
    merged: dict = {}
    for uid in set(list(exclusions.keys()) + list(history_exclusions.keys())):
        merged[uid] = exclusions.get(uid, set()) | history_exclusions.get(uid, set())

    try:
        assignment = draw_secret_santa(participant_ids, merged)
    except ValueError:
        # Si l'historique bloque tout, on tente sans l'historique
        try:
            assignment = draw_secret_santa(participant_ids, exclusions)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    for p in santa.participants:
        p.assigned_to_id = assignment[p.user_id]

    santa.status = "drawn"
    db.commit()
    db.refresh(santa)

    # Envoyer les résultats par email
    for p in santa.participants:
        if p.assigned_to:
            send_santa_result(
                participant_email=p.user.email,
                participant_first=p.user.first_name,
                assigned_first=p.assigned_to.first_name,
                assigned_last=p.assigned_to.last_name,
                santa_name=santa.name,
            )

    return SecretSantaDetailResponse(**_build_detail(santa))


@admin_router.post("/{santa_id}/clone", response_model=SecretSantaDetailResponse, status_code=201)
def clone_santa(
    santa_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Crée un nouveau Secret Santa brouillon basé sur le précédent (même participants + exclusions)."""
    source = db.query(SecretSanta).filter(SecretSanta.id == santa_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Secret Santa introuvable")
    if source.status != "drawn":
        raise HTTPException(status_code=400, detail="Seul un tirage déjà effectué peut être reconduit")

    import re
    # Génère un nom pour la nouvelle édition
    match = re.search(r"(\d{4})$", source.name)
    if match:
        new_name = source.name[:match.start()] + str(int(match.group()) + 1)
    else:
        new_name = source.name + " (suite)"

    new_santa = SecretSanta(
        name=new_name,
        description=source.description,
        based_on_id=source.id,
    )
    db.add(new_santa)
    db.flush()

    for p in source.participants:
        db.add(SecretSantaParticipant(santa_id=new_santa.id, user_id=p.user_id))
    for exc in source.exclusions:
        db.add(SecretSantaExclusion(
            santa_id=new_santa.id,
            user_id=exc.user_id,
            excluded_user_id=exc.excluded_user_id,
        ))

    db.commit()
    db.refresh(new_santa)
    return SecretSantaDetailResponse(**_build_detail(new_santa))


# ─── User routes ──────────────────────────────────────────────────────────────

@user_router.get("/mine", response_model=List[MyAssignmentResponse])
def my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    participations = (
        db.query(SecretSantaParticipant)
        .filter(
            SecretSantaParticipant.user_id == current_user.id,
            SecretSantaParticipant.assigned_to_id.isnot(None),
        )
        .all()
    )

    result = []
    for p in participations:
        wishlist = db.query(WishItem).filter(WishItem.user_id == p.assigned_to_id).all()
        result.append(MyAssignmentResponse(
            santa_id=p.santa_id,
            santa_name=p.santa.name,
            assigned_to=SantaUserInfo.model_validate(p.assigned_to),
            wishlist=[WishItemResponse.model_validate(w) for w in wishlist],
        ))
    return result
