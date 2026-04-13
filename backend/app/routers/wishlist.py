import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import User, WishItem, WishItemHidden
from ..schemas import WishItemResponse
from ..dependencies import get_current_user

router = APIRouter(prefix="/wishlist", tags=["wishlist"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


@router.get("", response_model=List[WishItemResponse])
def list_wish_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(WishItem).filter(
        WishItem.user_id == current_user.id,
        WishItem.child_id == None,
        (WishItem.suggested_by_id == None) | (WishItem.visible_to_recipient == True),
    ).order_by(WishItem.created_at.desc()).all()


VALID_CATEGORIES = {"confessions", "gage", "defis", "autre"}


@router.post("", response_model=WishItemResponse, status_code=201)
async def create_wish_item(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    if category and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Catégorie invalide")

    item = WishItem(
        user_id=current_user.id,
        name=name,
        description=description or None,
        url=url or None,
        image=image_path,
        category=category or None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=WishItemResponse)
async def update_wish_item(
    item_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WishItem).filter(WishItem.id == item_id, WishItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Souhait introuvable")

    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Catégorie invalide")

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


@router.delete("/{item_id}", status_code=204)
def delete_wish_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WishItem).filter(WishItem.id == item_id, WishItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Souhait introuvable")

    if item.image:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(item.image))
        if os.path.exists(old_path):
            os.remove(old_path)

    db.delete(item)
    db.commit()


@router.post("/suggestions/{item_id}/accept", response_model=WishItemResponse)
def accept_suggestion(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accepte une suggestion : la suggestion devient un souhait normal."""
    item = db.query(WishItem).filter(
        WishItem.id == item_id,
        WishItem.user_id == current_user.id,
        WishItem.suggested_by_id.isnot(None),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Suggestion introuvable")
    item.suggested_by_id = None
    db.commit()
    db.refresh(item)
    return item


@router.delete("/suggestions/{item_id}", status_code=204)
def reject_suggestion(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Refuse et supprime une suggestion."""
    item = db.query(WishItem).filter(
        WishItem.id == item_id,
        WishItem.user_id == current_user.id,
        WishItem.suggested_by_id.isnot(None),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Suggestion introuvable")
    db.delete(item)
    db.commit()


@router.post("/{item_id}/hide/{user_id}", response_model=WishItemResponse)
def hide_from_user(
    item_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cache un souhait à un utilisateur spécifique."""
    item = db.query(WishItem).filter(WishItem.id == item_id, WishItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Souhait introuvable")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    already = db.query(WishItemHidden).filter(
        WishItemHidden.wish_item_id == item_id,
        WishItemHidden.hidden_from_user_id == user_id,
    ).first()
    if not already:
        db.add(WishItemHidden(wish_item_id=item_id, hidden_from_user_id=user_id))
        db.commit()
        db.refresh(item)
    return item


@router.delete("/{item_id}/hide/{user_id}", response_model=WishItemResponse)
def unhide_from_user(
    item_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rend un souhait à nouveau visible pour un utilisateur."""
    item = db.query(WishItem).filter(WishItem.id == item_id, WishItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Souhait introuvable")

    hidden = db.query(WishItemHidden).filter(
        WishItemHidden.wish_item_id == item_id,
        WishItemHidden.hidden_from_user_id == user_id,
    ).first()
    if hidden:
        db.delete(hidden)
        db.commit()
        db.refresh(item)
    return item
