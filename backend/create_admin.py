"""
Script pour créer le premier compte administrateur.
Usage : python create_admin.py
"""
import sys
from getpass import getpass
from app.database import SessionLocal, engine
from app.models import Base, User, UserStatus
from app.security import hash_password

Base.metadata.create_all(bind=engine)


def main():
    print("=== Création d'un compte administrateur ===\n")
    email = input("Email : ").strip()
    first_name = input("Prénom : ").strip()
    last_name = input("Nom : ").strip()
    password = getpass("Mot de passe : ")

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"\nErreur : un compte avec l'email {email} existe déjà.")
            sys.exit(1)

        admin = User(
            email=email,
            hashed_password=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            is_admin=True,
            status=UserStatus.approved,
        )
        db.add(admin)
        db.commit()
        print(f"\nAdministrateur créé avec succès ({email}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
