import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  santaAdminApi, adminApi,
  SecretSantaDetail, SantaParticipant, SantaExclusion, User,
} from "../api/client";

const btn = (color: string): React.CSSProperties => ({
  padding: "6px 14px", background: color, color: "#fff",
  border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer",
});

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 16px",
};

function userName(u: { first_name: string; last_name: string; nickname: string | null }) {
  return `${u.first_name} ${u.last_name}${u.nickname ? ` « ${u.nickname} »` : ""}`;
}

function Avatar({ user }: { user: { first_name: string; profile_image: string | null } }) {
  return user.profile_image ? (
    <img src={user.profile_image} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#9ca3af", flexShrink: 0 }}>
      {user.first_name[0]}
    </div>
  );
}

export default function AdminSantaDetail() {
  const { id } = useParams<{ id: string }>();
  const santaId = Number(id);
  const navigate = useNavigate();

  const [santa, setSanta] = useState<SecretSantaDetail | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [cloning, setCloning] = useState(false);

  // Exclusion form
  const [excFrom, setExcFrom] = useState("");
  const [excTo, setExcTo] = useState("");

  useEffect(() => {
    Promise.all([
      santaAdminApi.get(santaId),
      adminApi.listUsers("approved"),
    ])
      .then(([s, users]) => { setSanta(s); setAllUsers(users); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [santaId]);

  if (loading) return <p style={{ padding: 32, fontFamily: "sans-serif" }}>Chargement...</p>;
  if (error || !santa) return <p style={{ padding: 32, color: "#ef4444", fontFamily: "sans-serif" }}>{error ?? "Introuvable"}</p>;

  const participantIds = new Set(santa.participants.map((p) => p.user.id));
  const nonParticipants = allUsers.filter((u) => !participantIds.has(u.id));
  const isDraft = santa.status === "draft";

  async function handleAddParticipant(userId: number) {
    const updated = await santaAdminApi.addParticipant(santaId, userId);
    setSanta(updated);
  }

  async function handleRemoveParticipant(userId: number) {
    const updated = await santaAdminApi.removeParticipant(santaId, userId);
    setSanta(updated);
  }

  async function handleAddExclusion() {
    if (!excFrom || !excTo || excFrom === excTo) return;
    try {
      const updated = await santaAdminApi.addExclusion(santaId, Number(excFrom), Number(excTo));
      setSanta(updated);
      setExcFrom(""); setExcTo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleRemoveExclusion(excId: number) {
    const updated = await santaAdminApi.removeExclusion(santaId, excId);
    setSanta(updated);
  }

  async function handleDraw() {
    setDrawing(true);
    setError(null);
    try {
      const updated = await santaAdminApi.draw(santaId);
      setSanta(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du tirage");
    } finally {
      setDrawing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${santa!.name}" ?`)) return;
    await santaAdminApi.delete(santaId);
    navigate("/admin");
  }

  async function handleClone() {
    setCloning(true);
    try {
      const newSanta = await santaAdminApi.clone(santaId);
      navigate(`/admin/santa/${newSanta.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCloning(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px", border: "1px solid #d1d5db",
    borderRadius: 6, fontSize: 13, flex: 1,
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <Link to="/admin" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← Retour</Link>
          <h1 style={{ margin: "6px 0 4px", fontSize: 22 }}>{santa.name}</h1>
          {santa.description && <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>{santa.description}</p>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{
            fontSize: 13, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
            background: isDraft ? "#fef3c7" : "#d1fae5",
            color: isDraft ? "#92400e" : "#065f46",
          }}>
            {isDraft ? "En cours de configuration" : "Tirage effectué"}
          </span>
          {!isDraft && (
            <button onClick={handleClone} disabled={cloning} style={btn("#4f46e5")}>
              {cloning ? "..." : "↻ Reconduire"}
            </button>
          )}
          <button onClick={handleDelete} style={btn("#ef4444")}>Supprimer</button>
        </div>
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>}

      {/* History banner */}
      {isDraft && santa.based_on_id && (
        <div style={{ marginBottom: 20, padding: "10px 16px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
          Ce tirage évitera de répéter les attributions de <strong>« {santa.based_on_name} »</strong> (et des éditions précédentes).
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Participants */}
        <div style={card}>
          <h2 style={{ margin: "0 0 14px", fontSize: 16 }}>
            Participants ({santa.participants.length})
          </h2>

          {isDraft && nonParticipants.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <select
                style={selectStyle}
                defaultValue=""
                onChange={(e) => e.target.value && handleAddParticipant(Number(e.target.value))}
              >
                <option value="" disabled>Ajouter un participant…</option>
                {nonParticipants.map((u) => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>
          )}

          {santa.participants.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun participant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {santa.participants.map((p: SantaParticipant) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar user={p.user} />
                  <span style={{ flex: 1, fontSize: 14 }}>{userName(p.user)}</span>
                  {isDraft && (
                    <button
                      onClick={() => handleRemoveParticipant(p.user.id)}
                      style={{ ...btn("#f3f4f6"), color: "#ef4444", fontSize: 12 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exclusions */}
        <div style={card}>
          <h2 style={{ margin: "0 0 14px", fontSize: 16 }}>
            Exclusions ({santa.exclusions.length})
          </h2>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6b7280" }}>
            A ne peut pas offrir à B
          </p>

          {isDraft && santa.participants.length >= 2 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <select style={selectStyle} value={excFrom} onChange={(e) => setExcFrom(e.target.value)}>
                  <option value="" disabled>A (qui donne)</option>
                  {santa.participants.map((p) => (
                    <option key={p.user.id} value={p.user.id}>{p.user.first_name} {p.user.last_name}</option>
                  ))}
                </select>
                <select style={selectStyle} value={excTo} onChange={(e) => setExcTo(e.target.value)}>
                  <option value="" disabled>B (qui reçoit)</option>
                  {santa.participants.filter((p) => String(p.user.id) !== excFrom).map((p) => (
                    <option key={p.user.id} value={p.user.id}>{p.user.first_name} {p.user.last_name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleAddExclusion} style={btn("#4f46e5")} disabled={!excFrom || !excTo}>
                Ajouter l'exclusion
              </button>
            </div>
          )}

          {santa.exclusions.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucune exclusion.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {santa.exclusions.map((exc: SantaExclusion) => (
                <div key={exc.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ flex: 1 }}>
                    <strong>{exc.user.first_name}</strong> ✗ <strong>{exc.excluded_user.first_name}</strong>
                  </span>
                  {isDraft && (
                    <button onClick={() => handleRemoveExclusion(exc.id)} style={{ ...btn("#f3f4f6"), color: "#ef4444", fontSize: 12 }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Draw / Results */}
      {isDraft ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <button
            onClick={handleDraw}
            disabled={drawing || santa.participants.length < 2}
            style={{ ...btn("#10b981"), fontSize: 16, padding: "12px 32px", opacity: drawing ? 0.7 : 1 }}
          >
            {drawing ? "Tirage en cours..." : "🎲 Lancer le tirage"}
          </button>
          {santa.participants.length < 2 && (
            <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>Il faut au moins 2 participants</p>
          )}
        </div>
      ) : (
        <div style={card}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>Résultats du tirage</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {santa.participants.map((p: SantaParticipant) => (
              <div key={p.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: p.assigned_to_wishlist?.length ? 8 : 0 }}>
                  <Avatar user={p.user} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{userName(p.user)}</span>
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>offre à</span>
                  {p.assigned_to && <Avatar user={p.assigned_to} />}
                  {p.assigned_to && <span style={{ fontSize: 14, fontWeight: 600 }}>{userName(p.assigned_to)}</span>}
                </div>

                {p.assigned_to_wishlist && p.assigned_to_wishlist.length > 0 && (
                  <div style={{ marginLeft: 46, display: "flex", flexDirection: "column", gap: 4 }}>
                    {p.assigned_to_wishlist.map((w) => (
                      <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b5563" }}>
                        {w.image && <img src={w.image} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />}
                        <span>
                          {w.url ? <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5" }}>{w.name}</a> : w.name}
                          {w.description && <span style={{ color: "#9ca3af" }}> — {w.description}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {p.assigned_to_wishlist?.length === 0 && (
                  <p style={{ marginLeft: 46, fontSize: 12, color: "#9ca3af" }}>Aucun souhait renseigné.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
