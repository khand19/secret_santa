import os
import boto3
from botocore.exceptions import ClientError

SENDER = os.getenv("SES_SENDER", "kevin.l.laurent@gmail.com")
AWS_REGION = os.getenv("AWS_REGION", "eu-west-1")
APP_URL = os.getenv("APP_URL", "https://famille-laurent.duckdns.org")


def _ses():
    return boto3.client(
        "ses",
        region_name=AWS_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


def _send(to: str, subject: str, html: str):
    try:
        _ses().send_email(
            Source=SENDER,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Html": {"Data": html, "Charset": "UTF-8"}},
            },
        )
    except ClientError as e:
        print(f"[SES] Erreur envoi email à {to}: {e}")


# ─── Templates ────────────────────────────────────────────────────────────────

def send_new_registration(admin_email: str, user_first: str, user_last: str, user_email: str):
    """Notifie l'admin qu'un nouvel utilisateur attend validation."""
    _send(
        to=admin_email,
        subject=f"[Famille] Nouvelle inscription : {user_first} {user_last}",
        html=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>Nouvelle inscription en attente</h2>
            <p><strong>{user_first} {user_last}</strong> ({user_email}) vient de s'inscrire.</p>
            <p>Connecte-toi pour approuver ou refuser ce compte :</p>
            <a href="{APP_URL}/admin" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
                Gérer les inscriptions →
            </a>
        </div>
        """,
    )


def send_account_approved(user_email: str, user_first: str):
    """Notifie l'utilisateur que son compte a été approuvé."""
    _send(
        to=user_email,
        subject="[Famille] Ton compte a été approuvé !",
        html=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>Bienvenue {user_first} ! 🎉</h2>
            <p>Ton compte a été approuvé. Tu peux maintenant te connecter.</p>
            <a href="{APP_URL}/login" style="display:inline-block;padding:10px 20px;background:#10b981;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
                Se connecter →
            </a>
        </div>
        """,
    )


def send_santa_result(participant_email: str, participant_first: str, assigned_first: str, assigned_last: str, santa_name: str):
    """Envoie le résultat du tirage Secret Santa au participant."""
    _send(
        to=participant_email,
        subject=f"[Famille] Ton tirage Secret Santa — {santa_name}",
        html=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>🎅 {santa_name}</h2>
            <p>Bonjour {participant_first},</p>
            <p>Le tirage a été effectué ! Tu offres un cadeau à :</p>
            <div style="padding:20px;background:#f3f4f6;border-radius:8px;text-align:center;margin:20px 0">
                <span style="font-size:24px;font-weight:bold;color:#4f46e5">{assigned_first} {assigned_last}</span>
            </div>
            <p>Consulte sa liste de souhaits sur l'app :</p>
            <a href="{APP_URL}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
                Voir la liste de souhaits →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:20px">Ne partage pas cet email !</p>
        </div>
        """,
    )


def send_invitation(invited_email: str, invited_name: str, inviter_name: str):
    """Envoie une invitation à rejoindre l'app."""
    _send(
        to=invited_email,
        subject=f"[Famille] {inviter_name} t'invite à rejoindre l'app famille",
        html=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>Tu es invité(e) ! 🎊</h2>
            <p>Bonjour {invited_name},</p>
            <p><strong>{inviter_name}</strong> t'invite à rejoindre l'application de la famille.</p>
            <p>Crée ton compte en cliquant ci-dessous :</p>
            <a href="{APP_URL}/register" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
                Créer mon compte →
            </a>
        </div>
        """,
    )
