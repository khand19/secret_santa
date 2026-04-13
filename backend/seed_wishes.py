"""
Script pour ajouter des souhaits aux 10 utilisateurs de test.
Usage : venv/bin/python seed_wishes.py
"""
from app.database import SessionLocal, engine
from app.models import Base, User, WishItem

Base.metadata.create_all(bind=engine)

WISHES = {
    "alice@test.com": [
        {"name": "Air Fryer Tefal", "description": "Modèle Easy Fry 4.2L", "url": "https://www.amazon.fr"},
        {"name": "Livre : Atomic Habits", "description": "James Clear", "url": "https://www.fnac.com"},
        {"name": "Bougie Diptyque Baies", "description": "Taille medium", "url": None},
    ],
    "bob@test.com": [
        {"name": "Manette PS5 DualSense", "description": "Couleur Cosmic Red", "url": "https://www.amazon.fr"},
        {"name": "Casque Sony WH-1000XM5", "description": "Réduction de bruit active", "url": "https://www.fnac.com"},
        {"name": "Abonnement Spotify 3 mois", "description": None, "url": None},
    ],
    "claire@test.com": [
        {"name": "Tapis de yoga Lululemon", "description": "5mm, couleur violet", "url": "https://www.lululemon.com"},
        {"name": "Carnet Leuchtturm1917 A5", "description": "Pointillés, couleur marine", "url": None},
        {"name": "Diffuseur huiles essentielles", "description": "Marque Muji", "url": "https://www.muji.com"},
    ],
    "david@test.com": [
        {"name": "Livre : Clean Code", "description": "Robert C. Martin", "url": "https://www.amazon.fr"},
        {"name": "Clé USB 128Go USB-C", "description": "Samsung Bar Plus", "url": "https://www.amazon.fr"},
        {"name": "Mug isotherme Stanley", "description": "473ml, couleur noire", "url": None},
    ],
    "emma@test.com": [
        {"name": "Palette Too Faced Chocolate Bar", "description": None, "url": "https://www.sephora.fr"},
        {"name": "Roman : Le Petit Prince", "description": "Édition illustrée", "url": "https://www.fnac.com"},
        {"name": "Chaussettes Burlington", "description": "Pack de 3", "url": None},
    ],
    "francois@test.com": [
        {"name": "Livre de cuisine Ottolenghi", "description": "Simple", "url": "https://www.amazon.fr"},
        {"name": "Tablier de cuisine", "description": "Couleur anthracite", "url": None},
        {"name": "Cafetière à piston Bodum", "description": "1L", "url": "https://www.amazon.fr"},
    ],
    "gab@test.com": [
        {"name": "Sneakers Nike Air Force 1", "description": "Blanc, taille 42", "url": "https://www.nike.com"},
        {"name": "Portefeuille en cuir", "description": "Marque A.P.C.", "url": None},
        {"name": "Parfum Bleu de Chanel", "description": "EDT 50ml", "url": "https://www.sephora.fr"},
    ],
    "hugo@test.com": [
        {"name": "Jeu de société Catan", "description": "Version de base", "url": "https://www.amazon.fr"},
        {"name": "Lampe de bureau LED", "description": "Avec port USB intégré", "url": None},
        {"name": "Gourde Hydro Flask 500ml", "description": "Couleur forest", "url": "https://www.amazon.fr"},
    ],
    "ines@test.com": [
        {"name": "Écouteurs AirPods Pro 2", "description": None, "url": "https://www.apple.com"},
        {"name": "Livre : Dune", "description": "Frank Herbert, édition poche", "url": "https://www.fnac.com"},
        {"name": "Plaid sherpa", "description": "Couleur beige, 150x200cm", "url": None},
    ],
    "jules@test.com": [
        {"name": "Switch Nintendo", "description": "Modèle OLED", "url": "https://www.amazon.fr"},
        {"name": "Jeu Zelda : Tears of the Kingdom", "description": None, "url": "https://www.fnac.com"},
        {"name": "Chargeur MagSafe 15W", "description": None, "url": "https://www.apple.com"},
    ],
}

db = SessionLocal()
created = 0
skipped = 0

for email, wishes in WISHES.items():
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"  skip  {email} (utilisateur introuvable, lancez seed_users.py d'abord)")
        skipped += len(wishes)
        continue
    for w in wishes:
        db.add(WishItem(
            user_id=user.id,
            name=w["name"],
            description=w.get("description"),
            url=w.get("url"),
        ))
        created += 1
        print(f"  créé  [{user.first_name}] {w['name']}")

db.commit()
db.close()
print(f"\n{created} souhait(s) créé(s), {skipped} ignoré(s).")
