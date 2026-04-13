import { useState, ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/client";

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  marginBottom: 12,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    email: "",
    password: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => v && data.append(k, v));
      if (image) data.append("profile_image", image);
      await authApi.register(data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Inscription envoyée !</h2>
        <p style={{ color: "#6b7280" }}>
          Votre compte est en attente de validation par un administrateur.
          Vous recevrez accès une fois votre inscription approuvée.
        </p>
        <Link to="/login" style={{ color: "#4f46e5" }}>Aller à la connexion</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 24, fontSize: 22 }}>Créer un compte</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Prénom *</label>
            <input
              style={inputStyle}
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Nom *</label>
            <input
              style={inputStyle}
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <label style={{ fontSize: 13, fontWeight: 500 }}>Surnom</label>
        <input
          style={inputStyle}
          name="nickname"
          value={form.nickname}
          onChange={handleChange}
          placeholder="Optionnel"
        />

        <label style={{ fontSize: 13, fontWeight: 500 }}>Email *</label>
        <input
          style={inputStyle}
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label style={{ fontSize: 13, fontWeight: 500 }}>Mot de passe *</label>
        <input
          style={inputStyle}
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
        />

        <label style={{ fontSize: 13, fontWeight: 500 }}>Photo de profil</label>
        <input
          style={{ ...inputStyle, padding: "6px 0", border: "none" }}
          type="file"
          accept="image/*"
          onChange={handleImage}
        />
        {preview && (
          <img
            src={preview}
            alt="Aperçu"
            style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }}
          />
        )}

        {error && <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 15,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Envoi..." : "S'inscrire"}
        </button>
      </form>

      <p style={{ marginTop: 16, fontSize: 14, color: "#6b7280" }}>
        Déjà un compte ?{" "}
        <Link to="/login" style={{ color: "#4f46e5" }}>Se connecter</Link>
      </p>
    </div>
  );
}
