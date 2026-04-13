from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import User, UserStatus, WishItem, Reservation, Child
from ..schemas import UserResponse, PublicWishItemResponse, ReservedByInfo, SuggestedByInfo, ChildResponse
from ..dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


def _to_public(item: WishItem, is_owner: bool, current_user: User) -> PublicWishItemResponse:
    reserved_by = None
    if not is_owner and item.reservation:
        reserved_by = ReservedByInfo.model_validate(item.reservation.user)
    suggested_by = None
    if item.suggested_by_id:
        suggested_by = SuggestedByInfo.model_validate(item.suggested_by)
    return PublicWishItemResponse(
        id=item.id,
        user_id=item.user_id,
        name=item.name,
        description=item.description,
        url=item.url,
        image=item.image,
        created_at=item.created_at,
        reserved_by=reserved_by,
        suggested_by=suggested_by,
    )


@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liste tous les utilisateurs approuvés sauf soi-même."""
    return (
        db.query(User)
        .filter(User.status == UserStatus.approved, User.id != current_user.id)
        .order_by(User.first_name)
        .all()
    )


@router.get("/{user_id}/wishlist", response_model=List[PublicWishItemResponse])
def get_user_wishlist(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.status == UserStatus.approved).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    items = db.query(WishItem).filter(WishItem.user_id == user_id, WishItem.child_id == None).order_by(WishItem.created_at.desc()).all()
    is_owner = current_user.id == user_id
    if is_owner:
        # hide suggestions the suggester chose to keep secret
        items = [i for i in items if i.suggested_by_id is None or i.visible_to_recipient]
    else:
        items = [i for i in items if current_user.id not in i.hidden_from_ids]
    return [_to_public(item, is_owner, current_user) for item in items]


@router.get("/{user_id}/children", response_model=List[ChildResponse])
def get_user_children(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.status == UserStatus.approved).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return db.query(Child).filter(
        (Child.parent_user_id == user_id) | (Child.second_parent_user_id == user_id)
    ).order_by(Child.first_name).all()


@router.post("/{user_id}/children/{child_id}/wishlist/suggest", response_model=PublicWishItemResponse, status_code=201)
def suggest_child_wish_item(
    user_id: int,
    child_id: int,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    child = db.query(Child).filter(
        Child.id == child_id,
        (Child.parent_user_id == user_id) | (Child.second_parent_user_id == user_id),
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Enfant introuvable")

    if current_user.id in [child.parent_user_id, child.second_parent_user_id]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas suggérer pour votre propre enfant")

    item = WishItem(
        user_id=child.parent_user_id,
        child_id=child_id,
        name=name,
        description=description or None,
        url=url or None,
        suggested_by_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_public(item, is_owner=False, current_user=current_user)


@router.get("/{user_id}/children/{child_id}/wishlist", response_model=List[PublicWishItemResponse])
def get_child_wishlist(
    user_id: int,
    child_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    child = db.query(Child).filter(
        Child.id == child_id,
        (Child.parent_user_id == user_id) | (Child.second_parent_user_id == user_id),
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Enfant introuvable")
    items = db.query(WishItem).filter(WishItem.child_id == child_id).order_by(WishItem.created_at.desc()).all()
    is_owner = current_user.id == user_id
    if not is_owner:
        items = [i for i in items if current_user.id not in i.hidden_from_ids]
    return [_to_public(item, is_owner=False, current_user=current_user) for item in items]


@router.post("/{user_id}/wishlist/suggest", response_model=PublicWishItemResponse, status_code=201)
def suggest_wish_item(
    user_id: int,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    visible_to_recipient: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous suggérer un cadeau à vous-même")

    target = db.query(User).filter(User.id == user_id, User.status == UserStatus.approved).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    item = WishItem(
        user_id=user_id,
        name=name,
        description=description or None,
        url=url or None,
        suggested_by_id=current_user.id,
        visible_to_recipient=visible_to_recipient,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_public(item, is_owner=False, current_user=current_user)


@router.post("/{user_id}/wishlist/{item_id}/reserve", response_model=PublicWishItemResponse)
def reserve_item(
    user_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas réserver vos propres souhaits")

    item = db.query(WishItem).filter(WishItem.id == item_id, WishItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Souhait introuvable")

    if item.reservation:
        if item.reservation.user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Vous avez déjà réservé ce souhait")
        raise HTTPException(status_code=409, detail="Ce souhait est déjà réservé par quelqu'un d'autre")

    db.add(Reservation(wish_item_id=item_id, user_id=current_user.id))
    db.commit()
    db.refresh(item)
    return _to_public(item, is_owner=False, current_user=current_user)


@router.delete("/{user_id}/wishlist/{item_id}/reserve", response_model=PublicWishItemResponse)
def unreserve_item(
    user_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WishItem).filter(WishItem.id == item_id, WishItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Souhait introuvable")

    if not item.reservation or item.reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas réservé ce souhait")

    db.delete(item.reservation)
    db.commit()
    db.refresh(item)
    return _to_public(item, is_owner=False, current_user=current_user)
