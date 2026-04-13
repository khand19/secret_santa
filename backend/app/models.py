import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class UserStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    status = Column(Enum(UserStatus), default=UserStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wish_items = relationship("WishItem", foreign_keys="WishItem.user_id", back_populates="user", cascade="all, delete-orphan")
    children = relationship("Child", foreign_keys="Child.parent_user_id", back_populates="parent", cascade="all, delete-orphan")


class Child(Base):
    __tablename__ = "children"

    id = Column(Integer, primary_key=True, index=True)
    parent_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    second_parent_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    profile_image = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parent = relationship("User", foreign_keys=[parent_user_id], back_populates="children")
    second_parent = relationship("User", foreign_keys=[second_parent_user_id])
    wish_items = relationship("WishItem", foreign_keys="WishItem.child_id", back_populates="child", cascade="all, delete-orphan")


class WishItem(Base):
    __tablename__ = "wish_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("children.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    url = Column(String, nullable=True)
    image = Column(String, nullable=True)
    suggested_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    visible_to_recipient = Column(Boolean, default=True, nullable=False, server_default="1")
    category = Column(String, nullable=True)  # confessions | gage | defis | autre | null
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="wish_items")
    child = relationship("Child", foreign_keys=[child_id], back_populates="wish_items")
    suggested_by = relationship("User", foreign_keys=[suggested_by_id])
    reservation = relationship("Reservation", back_populates="wish_item", uselist=False, cascade="all, delete-orphan")
    hidden_from = relationship("WishItemHidden", back_populates="wish_item", cascade="all, delete-orphan")

    @property
    def hidden_from_ids(self) -> list:
        return [h.hidden_from_user_id for h in self.hidden_from]


class WishItemHidden(Base):
    __tablename__ = "wish_item_hidden"

    id = Column(Integer, primary_key=True, index=True)
    wish_item_id = Column(Integer, ForeignKey("wish_items.id"), nullable=False)
    hidden_from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    wish_item = relationship("WishItem", back_populates="hidden_from")


class SecretSanta(Base):
    __tablename__ = "secret_santas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="draft", nullable=False)  # draft | drawn
    based_on_id = Column(Integer, ForeignKey("secret_santas.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    participants = relationship("SecretSantaParticipant", back_populates="santa", cascade="all, delete-orphan")
    exclusions = relationship("SecretSantaExclusion", back_populates="santa", cascade="all, delete-orphan")
    based_on = relationship("SecretSanta", foreign_keys=[based_on_id], remote_side="SecretSanta.id")


class SecretSantaParticipant(Base):
    __tablename__ = "secret_santa_participants"

    id = Column(Integer, primary_key=True, index=True)
    santa_id = Column(Integer, ForeignKey("secret_santas.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    santa = relationship("SecretSanta", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


class SecretSantaExclusion(Base):
    __tablename__ = "secret_santa_exclusions"

    id = Column(Integer, primary_key=True, index=True)
    santa_id = Column(Integer, ForeignKey("secret_santas.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    excluded_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    santa = relationship("SecretSanta", back_populates="exclusions")
    user = relationship("User", foreign_keys=[user_id])
    excluded_user = relationship("User", foreign_keys=[excluded_user_id])


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    wish_item_id = Column(Integer, ForeignKey("wish_items.id"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    purchased = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wish_item = relationship("WishItem", back_populates="reservation")
    user = relationship("User", foreign_keys=[user_id])


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
