from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from .models import UserStatus


class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class ItemResponse(ItemBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    nickname: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    nickname: Optional[str]
    profile_image: Optional[str]
    is_admin: bool
    status: UserStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class ParentInfo(BaseModel):
    id: int
    first_name: str
    last_name: str
    profile_image: Optional[str]

    model_config = {"from_attributes": True}


class ChildResponse(BaseModel):
    id: int
    parent_user_id: int
    second_parent_user_id: Optional[int]
    second_parent: Optional[ParentInfo]
    first_name: str
    last_name: str
    profile_image: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SuggestedByInfo(BaseModel):
    id: int
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class WishItemResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    url: Optional[str]
    image: Optional[str]
    category: Optional[str] = None
    suggested_by: Optional[SuggestedByInfo]
    hidden_from_ids: List[int] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ReservedByInfo(BaseModel):
    id: int
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class PublicWishItemResponse(BaseModel):
    """WishItem visible par les autres — inclut le statut de réservation."""
    id: int
    user_id: int
    name: str
    description: Optional[str]
    url: Optional[str]
    image: Optional[str]
    created_at: datetime
    reserved_by: Optional[ReservedByInfo]
    suggested_by: Optional[SuggestedByInfo]


class MyReservationResponse(BaseModel):
    """Réservation faite par l'utilisateur courant."""
    id: int
    purchased: bool
    wish_item_name: str
    wish_item_description: Optional[str]
    wish_item_url: Optional[str]
    wish_item_image: Optional[str]
    wish_item_id: int
    owner_id: int
    owner_first_name: str
    owner_last_name: str
    owner_profile_image: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Secret Santa ─────────────────────────────────────────────────────────────

class SantaUserInfo(BaseModel):
    id: int
    first_name: str
    last_name: str
    nickname: Optional[str]
    profile_image: Optional[str]

    model_config = {"from_attributes": True}


class SantaExclusionResponse(BaseModel):
    id: int
    user: SantaUserInfo
    excluded_user: SantaUserInfo

    model_config = {"from_attributes": True}


class SantaParticipantResponse(BaseModel):
    id: int
    user: SantaUserInfo
    assigned_to: Optional[SantaUserInfo]
    assigned_to_wishlist: Optional[List[WishItemResponse]] = None

    model_config = {"from_attributes": True}


class SecretSantaResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    participant_count: int
    based_on_id: Optional[int]
    based_on_name: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SecretSantaDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    participants: List[SantaParticipantResponse]
    exclusions: List[SantaExclusionResponse]
    based_on_id: Optional[int]
    based_on_name: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class MyAssignmentResponse(BaseModel):
    santa_id: int
    santa_name: str
    assigned_to: SantaUserInfo
    wishlist: List[WishItemResponse]
