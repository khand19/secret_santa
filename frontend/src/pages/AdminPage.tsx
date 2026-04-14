import { useEffect, useState } from "react";
import { adminApi, santaAdminApi, User, SecretSanta } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

type FilterStatus = "pending" | "approved" | "rejected" | "all";
type Tab = "users" | "all-users" | "santa" | "invite";

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .listUsers(filter)
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleApprove(id: number) {
    const updated = await adminApi.approve(id);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
  }

  async function handleReject(id: number) {
    const updated = await adminApi.reject(id);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["pending", "approved", "rejected", "all"] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid #d1d5db",
              background: filter === s ? "#4f46e5" : "#fff",
              color: filter === s ? "#fff" : "#374151",
              cursor: "pointer", fontSize: 13,
            }}
          >
            {s === "all" ? "Tous" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}
      {loading ? (
        <p>Chargement...</p>
      ) : users.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Aucun utilisateur dans cette catégorie.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {users.map((u) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              {u.profile_image ? (
                <img src={u.profile_image} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#9ca3af", flexShrink: 0 }}>
                  {u.first_name[0]}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {u.first_name} {u.last_name}
                  {u.nickname && <span style={{ fontWeight: 400, color: "#6b7280" }}> « {u.nickname} »</span>}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{u.email}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: STATUS_COLORS[u.status] + "22", color: STATUS_COLORS[u.status] }}>
                {STATUS_LABELS[u.status]}
              </span>
              {u.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleApprove(u.id)} style={{ padding: "6px 14px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Approuver</button>
                  <button onClick={() => handleReject(u.id)} style={{ padding: "6px 14px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Refuser</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── All users tab ────────────────────────────────────────────────────────────

function PasswordResetForm({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminApi.resetPassword(userId, password);
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8, padding: "10px 12px", background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      {success ? (
        <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>✓ Mot de passe mis à jour</span>
      ) : (
        <>
          {error && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{error}</p>}
          <input
            type="password"
            placeholder="Nouveau mot de passe (min. 6 caractères)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "5px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: "5px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {loading ? "..." : "Enregistrer"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function AllUsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);
  const [togglingAdmin, setTogglingAdmin] = useState<number | null>(null);

  useEffect(() => {
    adminApi.listUsers("all").then(setUsers).finally(() => setLoading(false));
  }, []);

  async function handleCopy(user: User) {
    await navigator.clipboard.writeText(user.email);
    setCopied(user.id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleCopyAll() {
    const emails = users.map((u) => u.email).join(", ");
    await navigator.clipboard.writeText(emails);
    setCopied(-1);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleToggleAdmin(userId: number) {
    setTogglingAdmin(userId);
    try {
      const updated = await adminApi.toggleAdmin(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } finally {
      setTogglingAdmin(null);
    }
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>{users.length} utilisateur{users.length !== 1 ? "s" : ""}</span>
        <button
          onClick={handleCopyAll}
          style={{
            fontSize: 13, padding: "6px 14px", border: "1px solid #d1d5db",
            borderRadius: 6, background: copied === -1 ? "#d1fae5" : "#fff",
            color: copied === -1 ? "#065f46" : "#374151", cursor: "pointer",
          }}
        >
          {copied === -1 ? "✓ Copié !" : "Copier tous les emails"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {users.map((u) => (
          <div key={u.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
              {u.profile_image ? (
                <img src={u.profile_image} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#9ca3af", flexShrink: 0 }}>
                  {u.first_name[0]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {u.first_name} {u.last_name}
                  {u.nickname && <span style={{ fontWeight: 400, color: "#6b7280" }}> « {u.nickname} »</span>}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.email}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: STATUS_COLORS[u.status] + "22", color: STATUS_COLORS[u.status], flexShrink: 0 }}>
                {STATUS_LABELS[u.status]}
              </span>
              <button
                onClick={() => handleCopy(u)}
                style={{
                  fontSize: 12, padding: "4px 12px", border: "1px solid #d1d5db",
                  borderRadius: 6, background: copied === u.id ? "#d1fae5" : "#fff",
                  color: copied === u.id ? "#065f46" : "#374151", cursor: "pointer", flexShrink: 0,
                }}
              >
                {copied === u.id ? "✓ Copié !" : "Copier email"}
              </button>
              {currentUser?.id !== u.id && (
                <button
                  onClick={() => handleToggleAdmin(u.id)}
                  disabled={togglingAdmin === u.id}
                  style={{
                    fontSize: 12, padding: "4px 12px", border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background: u.is_admin ? "#fef3c7" : "#fff",
                    color: u.is_admin ? "#92400e" : "#374151",
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {togglingAdmin === u.id ? "..." : u.is_admin ? "★ Admin" : "☆ Admin"}
                </button>
              )}
              <button
                onClick={() => setResetId(resetId === u.id ? null : u.id)}
                style={{
                  fontSize: 12, padding: "4px 12px", border: "1px solid #d1d5db",
                  borderRadius: 6, background: resetId === u.id ? "#ede9fe" : "#fff",
                  color: resetId === u.id ? "#4f46e5" : "#374151", cursor: "pointer", flexShrink: 0,
                }}
              >
                Mot de passe
              </button>
            </div>
            {resetId === u.id && (
              <div style={{ padding: "0 14px 14px" }}>
                <PasswordResetForm userId={u.id} onClose={() => setResetId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Invite tab ───────────────────────────────────────────────────────────────

function InviteTab() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await adminApi.invite(email, name);
      setSuccess(true);
      setEmail("");
      setName("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400 }}>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>
        Envoie une invitation par email à quelqu'un pour qu'il rejoigne l'app.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Prénom</label>
          <input
            style={{ display: "block", width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
            value={name} onChange={(e) => setName(e.target.value)} required placeholder="Prénom de la personne"
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Email</label>
          <input
            type="email"
            style={{ display: "block", width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
            value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@exemple.com"
          />
        </div>
        {error && <p style={{ margin: 0, fontSize: 13, color: "#ef4444" }}>{error}</p>}
        {success && <p style={{ margin: 0, fontSize: 13, color: "#10b981", fontWeight: 600 }}>✓ Invitation envoyée !</p>}
        <button
          type="submit" disabled={loading}
          style={{ padding: "10px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          {loading ? "Envoi..." : "Envoyer l'invitation"}
        </button>
      </form>
    </div>
  );
}

// ─── Secret Santa tab ─────────────────────────────────────────────────────────

function SantaTab() {
  const [santas, setSantas] = useState<SecretSanta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    santaAdminApi.list().then(setSantas).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const s = await santaAdminApi.create(name.trim(), description.trim());
      setSantas((prev) => [s, ...prev]);
      setName(""); setDescription(""); setShowForm(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ padding: "8px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}
        >
          {showForm ? "Annuler" : "+ Nouveau Secret Santa"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 20, background: "#fafafa" }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Nom *</label>
            <input
              style={{ display: "block", width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
              value={name} onChange={(e) => setName(e.target.value)} required
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Description</label>
            <input
              style={{ display: "block", width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel"
            />
          </div>
          <button type="submit" style={{ padding: "8px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }} disabled={creating}>
            {creating ? "Création..." : "Créer"}
          </button>
        </form>
      )}

      {loading ? (
        <p>Chargement...</p>
      ) : santas.length === 0 ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>Aucun Secret Santa créé.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {santas.map((s) => (
            <Link
              key={s.id}
              to={`/admin/santa/${s.id}`}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", border: "1px solid #e5e7eb", borderRadius: 8, textDecoration: "none", color: "inherit" }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>🎅 {s.name}</div>
                {s.description && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{s.description}</div>}
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  {s.participant_count} participant{s.participant_count !== 1 ? "s" : ""} · Créé le {new Date(s.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                background: s.status === "draft" ? "#fef3c7" : "#d1fae5",
                color: s.status === "draft" ? "#92400e" : "#065f46",
              }}>
                {s.status === "draft" ? "En cours" : "Tiré"}
              </span>
              <span style={{ color: "#9ca3af", fontSize: 18 }}>›</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px", border: "none",
    borderBottom: active ? "2px solid #4f46e5" : "2px solid transparent",
    background: "none", fontWeight: active ? 600 : 400,
    color: active ? "#4f46e5" : "#6b7280", cursor: "pointer", fontSize: 15,
  });

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Administration</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← Accueil</Link>
          <span style={{ fontSize: 14, color: "#6b7280" }}>{user?.first_name} {user?.last_name}</span>
          <button onClick={handleLogout} style={{ fontSize: 13, background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
        <button style={tabStyle(tab === "users")} onClick={() => setTab("users")}>Inscriptions</button>
        <button style={tabStyle(tab === "all-users")} onClick={() => setTab("all-users")}>Utilisateurs</button>
        <button style={tabStyle(tab === "santa")} onClick={() => setTab("santa")}>🎅 Secret Santa</button>
        <button style={tabStyle(tab === "invite")} onClick={() => setTab("invite")}>✉️ Inviter</button>
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "all-users" && <AllUsersTab />}
      {tab === "santa" && <SantaTab />}
      {tab === "invite" && <InviteTab />}
    </div>
  );
}
