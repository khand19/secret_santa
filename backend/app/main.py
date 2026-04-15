import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .database import engine, Base
from .routers import items
from .routers import auth, admin, profile, wishlist, users, reservations, children
from .routers.secret_santa import admin_router as santa_admin_router, user_router as santa_user_router
from .routers.qwixx import router as qwixx_router
from .routers.undercover import router as undercover_router

Base.metadata.create_all(bind=engine)

# ─── Migrations ────────────────────────────────────────────────────────────────
with engine.connect() as _conn:
    from sqlalchemy import text as _text
    for _ddl in [
        "ALTER TABLE wish_items ADD COLUMN category VARCHAR",
    ]:
        try:
            _conn.execute(_text(_ddl))
            _conn.commit()
        except Exception:
            pass

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")

app = FastAPI(title="My API", version="1.0.0")

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    session_cookie="session",
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(items.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(wishlist.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(children.router, prefix="/api")
app.include_router(santa_admin_router, prefix="/api")
app.include_router(santa_user_router, prefix="/api")
app.include_router(qwixx_router, prefix="/api")
app.include_router(undercover_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "API is running"}
