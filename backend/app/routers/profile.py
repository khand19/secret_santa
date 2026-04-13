import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import User
from ..schemas import UserResponse
from ..dependencies import get_current_user
from ..security import hash_password

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


@router.patch("", response_model=UserResponse)
async def update_profile(
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    nickname: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    profile_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if email and email != current_user.email:
        if db.query(User).filter(User.email == email, User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        current_user.email = email

    if first_name:
        current_user.first_name = first_name
    if last_name:
        current_user.last_name = last_name

    # nickname peut être mis à "" pour le supprimer
    if nickname is not None:
        current_user.nickname = nickname or None

    if password:
        current_user.hashed_password = hash_password(password)

    if profile_image and profile_image.filename:
        if profile_image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Format d'image non supporté")
        content = await profile_image.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="Image trop lourde (max 5 Mo)")

        # Supprimer l'ancienne image
        if current_user.profile_image:
            old_path = os.path.join(UPLOAD_DIR, os.path.basename(current_user.profile_image))
            if os.path.exists(old_path):
                os.remove(old_path)

        ext = profile_image.filename.rsplit(".", 1)[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            f.write(content)
        current_user.profile_image = f"/uploads/{filename}"

    db.commit()
    db.refresh(current_user)
    return current_user
