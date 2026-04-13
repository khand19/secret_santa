"""
Script pour créer 10 utilisateurs de test.
Usage : python seed_users.py
"""
from app.database import SessionLocal, engine
from app.models import Base, User, UserStatus
from app.security import hash_password

Base.metadata.create_all(bind=engine)

USERS = [
    {"first_name": "Alice",   "last_name": "Martin",    "nickname": "Ali",    "email": "alice@test.com"},
    {"first_name": "Bob",     "last_name": "Dupont",    "nickname": "Bobby",  "email": "bob@test.com"},
    {"first_name": "Claire",  "last_name": "Leroy",     "nickname": None,     "email": "claire@test.com"},
    {"first_name": "David",   "last_name": "Morel",     "nickname": "Dav",    "email": "david@test.com"},
    {"first_name": "Emma",    "last_name": "Bernard",   "nickname": "Em",     "email": "emma@test.com"},
    {"first_name": "François","last_name": "Petit",     "nickname": "Fran",   "email": "francois@test.com"},
    {"first_name": "Gab",     "last_name": "Roux",      "nickname": "Gabi",   "email": "gab@test.com"},
    {"first_name": "Hugo",    "last_name": "Simon",     "nickname": None,     "email": "hugo@test.com"},
    {"first_name": "Inès",    "last_name": "Laurent",   "nickname": "Ines",   "email": "ines@test.com"},
    {"first_name": "Jules",   "last_name": "Fontaine",  "nickname": "Juju",   "email": "jules@test.com"},
]

db = SessionLocal()
created = 0
skipped = 0

for u in USERS:
    if db.query(User).filter(User.email == u["email"]).first():
        print(f"  skip  {u['email']} (existe déjà)")
        skipped += 1
        continue
    db.add(User(
        email=u["email"],
        hashed_password=hash_password("password123"),
        first_name=u["first_name"],
        last_name=u["last_name"],
        nickname=u["nickname"],
        status=UserStatus.approved,
    ))
    created += 1
    print(f"  créé  {u['first_name']} {u['last_name']} <{u['email']}>")

db.commit()
db.close()
print(f"\n{created} utilisateur(s) créé(s), {skipped} ignoré(s).")
print("Mot de passe pour tous : password123")
