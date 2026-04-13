import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import User, Child, WishItem, UserStatus
from ..schemas import ChildResponse, WishItemResponse
from ..dependencies import get_current_user

router = APIRouter(prefix="/children", tags=["children"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


def _can_manage(child_id: int, current_user: User, db: Session) -> Child:
    """Either parent can manage the child's wishlist and info."""
    child = db.query(Child).filter(
        Child.id == child_id,
        (Child.parent_user_id == current_user.id) | (Child.second_parent_user_id == current_user.id),
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Enfant introuvable")
    return child


def _primary_only(child_id: int, current_user: User, db: Session) -> Child:
    """Only the primary parent can delete the child or manage the second parent."""
    child = db.query(Child).filter(Child.id == child_id, Child.parent_user_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Enfant introuvable ou action non autorisée")
    return child


# ─── Children CRUD ────────────────────────────────────────────────────────────

@router.get("", response_model=List[ChildResponse])
def list_children(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Child).filter(
        (Child.parent_user_id == current_user.id) | (Child.second_parent_user_id == current_user.id)
    ).order_by(Child.first_name).all()


@router.post("", response_model=ChildResponse, status_code=201)
async def create_child(
    first_name: str = Form(...),
    last_name: str = Form(...),
    profile_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_path = None
    if profile_image and profile_image.filename:
        if profile_image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Format d'image non supporté")
        content = await profile_image.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="Image trop lourde (max 5 Mo)")
        ext = profile_image.filename.rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            f.write(content)
        image_path = f"/uploads/{filename}"

    child = Child(
        parent_user_id=current_user.id,
        first_name=first_name,
        last_name=last_name,
        profile_image=image_path,
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    return child


@router.patch("/{child_id}", response_model=ChildResponse)
async def update_child(
    child_id: int,
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    profile_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    child = _can_manage(child_id, current_user, db)

    if first_name:
        child.first_name = first_name
    if last_name:
        child.last_name = last_name

    if profile_image and profile_image.filename:
        if profile_image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Format d'image non supporté")
        content = await profile_image.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="Image trop lourde (max 5 Mo)")

        if child.profile_image:
            old_path = os.path.join(UPLOAD_DIR, os.path.basename(child.profile_image))
            if os.path.exists(old_path):
                os.remove(old_path)

        ext = profile_image.filename.rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            f.write(content)
        child.profile_image = f"/uploads/{filename}"

    db.commit()
    db.refresh(child)
    return child


@router.delete("/{child_id}", status_code=204)
def delete_child(
    child_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    child = _primary_only(child_id, current_user, db)
    if child.profile_image:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(child.profile_image))
        if os.path.exists(old_path):
            os.remove(old_path)
    db.delete(child)
    db.commit()


# ─── Child wishlist ────────────────────────────────────────────────────────────

@router.get("/{child_id}/wishlist", response_model=List[WishItemResponse])
def list_child_wishlist(
    child_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _can_manage(child_id, current_user, db)
    return db.query(WishItem).filter(WishItem.child_id == child_id).order_by(WishItem.created_at.desc()).all()


@router.post("/{child_id}/wishlist", response_model=WishItemResponse, status_code=201)
async def add_child_wish_item(
    child_id: int,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _can_manage(child_id, current_user, db)

    image_path = None
    if image and image.filename:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Format d'image non supporté")
        content = await image.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="Image trop lourde (max 5 Mo)")
        ext = image.filename.rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            f.write(content)
        image_path = f"/uploads/{filename}"

    item = WishItem(
        user_id=current_user.id,
        child_id=child_id,
        name=name,
        description=description or None,
        url=url or None,
        category=category or None,
        image=image_path,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{child_id}/wishlist/{item_id}", response_model=WishItemResponse)
async def update_child_wish_item(
    child_id: int,
    item_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _can_manage(child_id, current_user, db)
    item = db.query(WishItem).filter(WishItem.id == item_id, WishItem.child_id == child_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Souhait introuvable")

    if name:
        item.name = name
    if description is not None:
        item.description = description or None
    if url is not None:
        item.url = url or None
    if category is not None:
        item.category = category or None

    if image and image.filename:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Format d'image non supporté")
        content = await image.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="Image trop lourde (max 5 Mo)")
        if item.image:
            old_path = os.path.join(UPLOAD_DIR, os.path.basename(item.image))
            if os.path.exists(old_path):
                os.remove(old_path)
        ext = image.filename.rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            f.write(content)
        item.image = f"/uploads/{filename}"

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{child_id}/wishlist/{item_id}", status_code=204)
def delete_child_wish_item(
    child_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _can_manage(child_id, current_user, db)
    item = db.query(WishItem).filter(WishItem.id == item_id, WishItem.child_id == child_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Souhait introuvable")
    if item.image:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(item.image))
        if os.path.exists(old_path):
            os.remove(old_path)
    db.delete(item)
    db.commit()


# ─── Suggestions ─────────────────────────────────────────────────────────────

@router.post("/{child_id}/wishlist/{item_id}/accept-suggestion", response_model=WishItemResponse)
def accept_child_suggestion(
    child_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _can_manage(child_id, current_user, db)
    item = db.query(WishItem).filter(
        WishItem.id == item_id,
        WishItem.child_id == child_id,
        WishItem.suggested_by_id.isnot(None),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Suggestion introuvable")
    item.suggested_by_id = None
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{child_id}/wishlist/{item_id}/reject-suggestion", status_code=204)
def reject_child_suggestion(
    child_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _can_manage(child_id, current_user, db)
    item = db.query(WishItem).filter(
        WishItem.id == item_id,
        WishItem.child_id == child_id,
        WishItem.suggested_by_id.isnot(None),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Suggestion introuvable")
    db.delete(item)
    db.commit()


# ─── Second parent ─────────────────────────────────────────────────────────────

@router.put("/{child_id}/second-parent", response_model=ChildResponse)
def set_second_parent(
    child_id: int,
    user_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Associe un second parent à l'enfant (réservé au parent principal)."""
    child = _primary_only(child_id, current_user, db)

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous êtes déjà le parent principal")

    second = db.query(User).filter(User.id == user_id, User.status == UserStatus.approved).first()
    if not second:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    child.second_parent_user_id = user_id
    db.commit()
    db.refresh(child)
    return child


@router.delete("/{child_id}/second-parent", response_model=ChildResponse)
def remove_second_parent(
    child_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retire le second parent (réservé au parent principal)."""
    child = _primary_only(child_id, current_user, db)
    child.second_parent_user_id = None
    db.commit()
    db.refresh(child)
    return child
