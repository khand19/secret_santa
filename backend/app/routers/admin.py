from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, UserStatus
from ..schemas import UserResponse
from ..dependencies import get_admin_user
from ..security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserResponse])
def list_users(
    status: str = "pending",
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    query = db.query(User)
    if status != "all":
        try:
            query = query.filter(User.status == UserStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Statut invalide")
    return query.order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.status = UserStatus.approved
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/reject", response_model=UserResponse)
def reject_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.status = UserStatus.rejected
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/toggle-admin", response_model=UserResponse)
def toggle_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier vos propres droits")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/password", response_model=UserResponse)
def reset_user_password(
    user_id: int,
    password: str = Form(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.hashed_password = hash_password(password)
    db.commit()
    db.refresh(user)
    return user
