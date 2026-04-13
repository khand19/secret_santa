from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, Reservation
from ..schemas import MyReservationResponse
from ..dependencies import get_current_user

router = APIRouter(prefix="/reservations", tags=["reservations"])


def _to_response(r: Reservation) -> MyReservationResponse:
    item = r.wish_item
    owner = item.user
    return MyReservationResponse(
        id=r.id,
        purchased=r.purchased,
        wish_item_id=item.id,
        wish_item_name=item.name,
        wish_item_description=item.description,
        wish_item_url=item.url,
        wish_item_image=item.image,
        owner_id=owner.id,
        owner_first_name=owner.first_name,
        owner_last_name=owner.last_name,
        owner_profile_image=owner.profile_image,
        created_at=r.created_at,
    )


@router.get("/mine", response_model=List[MyReservationResponse])
def my_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservations = (
        db.query(Reservation)
        .filter(Reservation.user_id == current_user.id)
        .order_by(Reservation.created_at.desc())
        .all()
    )
    return [_to_response(r) for r in reservations]


@router.patch("/{reservation_id}/purchased", response_model=MyReservationResponse)
def toggle_purchased(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.user_id == current_user.id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Réservation introuvable")
    r.purchased = not r.purchased
    db.commit()
    db.refresh(r)
    return _to_response(r)
