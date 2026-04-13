import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileApi, wishlistApi, santaUserApi, usersApi, childrenApi, WishItem, MyAssignment, User, Child, WishCategory, WISH_CATEGORIES } from "../api/client";

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 18px",
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "6px 12px",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};

// ─── Category helpers ─────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: WishCategory | null }) {
  if (!category) return null;
  const cat = WISH_CATEGORIES.find((c) => c.value === category);
  if (!cat) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: cat.bg, color: cat.color, border: `1px solid ${cat.color}33`,
    }}>
      {cat.label}
    </span>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <button
        type="button"
        onClick={() => onChange("")}
        style={{
          padding: "4px 12px", borderRadius: 20, border: "1px solid",
          borderColor: value === "" ? "#4f46e5" : "#d1d5db",
          background: value === "" ? "#ede9fe" : "#fff",
          color: value === "" ? "#4f46e5" : "#6b7280",
          fontSize: 12, cursor: "pointer", fontWeight: value === "" ? 600 : 400,
        }}
      >
        Aucune
      </button>
      {WISH_CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => onChange(cat.value)}
          style={{
            padding: "4px 12px", borderRadius: 20, border: "1px solid",
            borderColor: value === cat.value ? cat.color : "#d1d5db",
            background: value === cat.value ? cat.bg : "#fff",
            color: value === cat.value ? cat.color : "#6b7280",
            fontSize: 12, cursor: "pointer", fontWeight: value === cat.value ? 600 : 400,
          }}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// ─── Profile section ─────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    nickname: user?.nickname ?? "",
    email: user?.email ?? "",
    password: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.profile_image ?? null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : user?.profile_image ?? null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const data = new FormData();
      if (form.first_name) data.append("first_name", form.first_name);
      if (form.last_name) data.append("last_name", form.last_name);
      data.append("nickname", form.nickname);
      if (form.email) data.append("email", form.email);
      if (form.password) data.append("password", form.password);
      if (imageFile) data.append("profile_image", imageFile);
      await profileApi.update(data);
      await refresh();
      setForm((f) => ({ ...f, password: "" }));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        {preview ? (
          <img src={preview} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#9ca3af" }}>
            {user?.first_name[0]}
          </div>
        )}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Changer la photo</label>
          <input type="file" accept="image/*" onChange={handleImage} style={{ fontSize: 13 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Prénom</label>
          <input style={inputStyle} name="first_name" value={form.first_name} onChange={handleChange} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Nom</label>
          <input style={inputStyle} name="last_name" value={form.last_name} onChange={handleChange} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Surnom</label>
        <input style={inputStyle} name="nickname" value={form.nickname} onChange={handleChange} placeholder="Optionnel" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Email</label>
        <input style={inputStyle} type="email" name="email" value={form.email} onChange={handleChange} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Nouveau mot de passe</label>
        <input style={inputStyle} type="password" name="password" value={form.password} onChange={handleChange} placeholder="Laisser vide pour ne pas changer" minLength={8} />
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: 12, fontSize: 14 }}>{error}</p>}
      {success && <p style={{ color: "#10b981", marginBottom: 12, fontSize: 14 }}>Profil mis à jour !</p>}

      <button type="submit" style={btnPrimary} disabled={saving}>
        {saving ? "Sauvegarde..." : "Sauvegarder"}
      </button>
    </form>
  );
}

// ─── Wish item card ───────────────────────────────────────────────────────────

function WishCard({ item, onUpdate, onDelete, allUsers }: { item: WishItem; onUpdate: (updated: WishItem) => void; onDelete: (id: number) => void; allUsers: User[] }) {
  const [editing, setEditing] = useState(false);
  const [showVisibility, setShowVisibility] = useState(false);
  const [form, setForm] = useState({ name: item.name, description: item.description ?? "", url: item.url ?? "", category: item.category ?? "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

  async function handleSave() {
    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", form.name);
      data.append("description", form.description);
      data.append("url", form.url);
      if (form.category) data.append("category", form.category);
      if (imageFile) data.append("image", imageFile);
      const updated = await wishlistApi.update(item.id, data);
      onUpdate(updated);
      setEditing(false);
      setImageFile(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisibility(userId: number) {
    setTogglingUserId(userId);
    try {
      const isHidden = item.hidden_from_ids.includes(userId);
      const updated = isHidden
        ? await wishlistApi.unhideFrom(item.id, userId)
        : await wishlistApi.hideFrom(item.id, userId);
      onUpdate(updated);
    } finally {
      setTogglingUserId(null);
    }
  }

  if (editing) {
    return (
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fafafa" }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500 }}>Nom *</label>
          <input style={{ ...inputStyle, marginTop: 2 }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500 }}>Description</label>
          <input style={{ ...inputStyle, marginTop: 2 }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optionnel" />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500 }}>URL</label>
          <input style={{ ...inputStyle, marginTop: 2 }} type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>Catégorie</label>
          <CategorySelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500 }}>Image</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13, display: "block", marginTop: 2 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSave} style={btnPrimary} disabled={saving}>{saving ? "..." : "Sauvegarder"}</button>
          <button onClick={() => setEditing(false)} style={{ ...btnPrimary, background: "#6b7280" }}>Annuler</button>
        </div>
      </div>
    );
  }

  const hiddenCount = item.hidden_from_ids.length;

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
        {item.image ? (
          <img src={item.image} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: 6, background: "#f3f4f6", flexShrink: 0 }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>
                  {item.name}
                </a>
              ) : item.name}
            </span>
            <CategoryBadge category={item.category} />
          </div>
          {item.description && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{item.description}</div>}
          {hiddenCount > 0 && (
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              Caché à {hiddenCount} personne{hiddenCount > 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowVisibility((v) => !v)}
            title="Gérer la visibilité"
            style={{
              ...btnPrimary,
              background: showVisibility ? "#ede9fe" : "#f3f4f6",
              color: showVisibility ? "#4f46e5" : "#374151",
              fontSize: 13,
              padding: "6px 10px",
            }}
          >
            {hiddenCount > 0 ? "👁️‍🗨️" : "👁️"}
          </button>
          <button onClick={() => setEditing(true)} style={{ ...btnPrimary, background: "#f3f4f6", color: "#374151", fontSize: 13 }}>Modifier</button>
          <button onClick={() => onDelete(item.id)} style={btnDanger}>Supprimer</button>
        </div>
      </div>

      {showVisibility && allUsers.length > 0 && (
        <div style={{ borderTop: "1px solid #f3f4f6", padding: "10px 16px", background: "#fafafa" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>
            Cacher ce cadeau à :
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allUsers.map((u) => {
              const isHidden = item.hidden_from_ids.includes(u.id);
              const isToggling = togglingUserId === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleToggleVisibility(u.id)}
                  disabled={isToggling}
                  style={{
                    padding: "4px 12px", borderRadius: 20, border: "1px solid",
                    borderColor: isHidden ? "#f87171" : "#d1d5db",
                    background: isHidden ? "#fef2f2" : "#fff",
                    color: isHidden ? "#b91c1c" : "#374151",
                    fontSize: 12, fontWeight: isHidden ? 600 : 400,
                    cursor: isToggling ? "not-allowed" : "pointer",
                    opacity: isToggling ? 0.5 : 1,
                  }}
                >
                  {isHidden ? "✗ " : ""}{u.first_name} {u.last_name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wishlist section ─────────────────────────────────────────────────────────

function WishlistSection() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", url: "", category: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      wishlistApi.list(),
      usersApi.list(),
    ]).then(([wishItems, users]) => {
      setItems(wishItems);
      setAllUsers(users);
    }).finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const data = new FormData();
      data.append("name", form.name);
      if (form.description) data.append("description", form.description);
      if (form.url) data.append("url", form.url);
      if (form.category) data.append("category", form.category);
      if (imageFile) data.append("image", imageFile);
      const item = await wishlistApi.create(data);
      setItems((prev) => [item, ...prev]);
      setForm({ name: "", description: "", url: "", category: "" });
      setImageFile(null);
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    await wishlistApi.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleUpdate(updated: WishItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function handleAcceptSuggestion(id: number) {
    const updated = await wishlistApi.acceptSuggestion(id);
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function handleRejectSuggestion(id: number) {
    await wishlistApi.rejectSuggestion(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const myItems = items.filter((i) => !i.suggested_by);
  const suggestions = items.filter((i) => i.suggested_by);
  const filteredItems = activeCategory === "all"
    ? myItems
    : activeCategory === "none"
      ? myItems.filter((i) => !i.category)
      : myItems.filter((i) => i.category === activeCategory);

  return (
    <div>
      {/* Suggestions reçues */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#7c3aed" }}>
            Suggestions reçues ({suggestions.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #c4b5fd", borderRadius: 8, background: "#faf5ff" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {item.url
                      ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>{item.name} ↗</a>
                      : item.name}
                  </div>
                  {item.description && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.description}</div>}
                  <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 3 }}>
                    Suggéré par {item.suggested_by!.first_name} {item.suggested_by!.last_name}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleAcceptSuggestion(item.id)}
                    style={{ padding: "5px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => handleRejectSuggestion(item.id)}
                    style={{ padding: "5px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
          <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
        </div>
      )}

      {/* Mes souhaits */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 15, color: "#6b7280" }}>{myItems.length} souhait{myItems.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowForm((v) => !v)} style={btnPrimary}>
          {showForm ? "Annuler" : "+ Ajouter un souhait"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16, background: "#fafafa" }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Nom *</label>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Description</label>
            <input style={inputStyle} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optionnel" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>URL</label>
            <input style={inputStyle} type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Catégorie</label>
            <CategorySelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Image</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
          </div>
          <button type="submit" style={btnPrimary} disabled={adding}>{adding ? "Ajout..." : "Ajouter"}</button>
        </form>
      )}

      {!loading && myItems.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {([
            { value: "all", label: `Tout (${myItems.length})` },
            { value: "none", label: "Sans catégorie", color: "#6b7280", bg: "#f9fafb" },
            ...WISH_CATEGORIES.map((c) => ({ ...c, label: `${c.label} (${myItems.filter((i) => i.category === c.value).length})` })),
          ] as { value: string; label: string; color?: string; bg?: string }[]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              style={{
                padding: "4px 12px", borderRadius: 20, border: "1px solid",
                borderColor: activeCategory === tab.value ? (tab.color ?? "#4f46e5") : "#e5e7eb",
                background: activeCategory === tab.value ? (tab.bg ?? "#ede9fe") : "#fff",
                color: activeCategory === tab.value ? (tab.color ?? "#4f46e5") : "#6b7280",
                fontSize: 12, cursor: "pointer", fontWeight: activeCategory === tab.value ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Chargement...</p>
      ) : myItems.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "32px 0" }}>Votre liste de souhaits est vide.</p>
      ) : filteredItems.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "24px 0" }}>Aucun souhait dans cette catégorie.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredItems.map((item) => (
            <WishCard key={item.id} item={item} onUpdate={handleUpdate} onDelete={handleDelete} allUsers={allUsers} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Secret Santa section ─────────────────────────────────────────────────────

function SantaSection() {
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    santaUserApi.mine().then(setAssignments).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#9ca3af" }}>Chargement...</p>;

  if (assignments.length === 0) {
    return (
      <p style={{ color: "#9ca3af", textAlign: "center", padding: "40px 0" }}>
        Vous ne participez à aucun Secret Santa pour le moment.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {assignments.map((a) => (
        <div key={a.santa_id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#4f46e5", padding: "12px 18px", color: "#fff" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>🎅 {a.santa_name}</div>
          </div>

          <div style={{ padding: "16px 18px" }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#374151" }}>
              Vous offrez un cadeau à :
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              {a.assigned_to.profile_image ? (
                <img src={a.assigned_to.profile_image} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#9ca3af" }}>
                  {a.assigned_to.first_name[0]}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>
                  {a.assigned_to.first_name} {a.assigned_to.last_name}
                </div>
                {a.assigned_to.nickname && (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>« {a.assigned_to.nickname} »</div>
                )}
              </div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#374151" }}>
              Liste de souhaits
            </div>

            {a.wishlist.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun souhait renseigné.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {a.wishlist.map((w) => (
                  <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 8 }}>
                    {w.image && (
                      <img src={w.image} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {w.url
                          ? <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>{w.name} ↗</a>
                          : w.name
                        }
                      </div>
                      {w.description && <div style={{ fontSize: 13, color: "#6b7280" }}>{w.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Child wish item card ──────────────────────────────────────────────────────

function ChildWishCard({ childId, item, onUpdate, onDelete }: { childId: number; item: WishItem; onUpdate: (u: WishItem) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: item.name, description: item.description ?? "", url: item.url ?? "" });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", form.name);
      data.append("description", form.description);
      data.append("url", form.url);
      const updated = await childrenApi.updateWishItem(childId, item.id, data);
      onUpdate(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa" }}>
        <input style={{ ...inputStyle, marginBottom: 6 }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom *" required />
        <input style={{ ...inputStyle, marginBottom: 6 }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" />
        <input style={{ ...inputStyle, marginBottom: 10 }} type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSave} style={btnPrimary} disabled={saving}>{saving ? "..." : "Sauvegarder"}</button>
          <button onClick={() => setEditing(false)} style={{ ...btnPrimary, background: "#6b7280" }}>Annuler</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px" }}>
      {item.image && <img src={item.image} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>{item.name} ↗</a> : item.name}
        </div>
        {item.description && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.description}</div>}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={() => setEditing(true)} style={{ ...btnPrimary, background: "#f3f4f6", color: "#374151", fontSize: 12, padding: "5px 10px" }}>Modifier</button>
        <button onClick={() => onDelete(item.id)} style={{ ...btnDanger, fontSize: 12, padding: "5px 10px" }}>Supprimer</button>
      </div>
    </div>
  );
}

// ─── Child panel ──────────────────────────────────────────────────────────────

function ChildPanel({ child, onUpdated, onDeleted, allUsers, currentUserId }: { child: Child; onUpdated: (c: Child) => void; onDeleted: (id: number) => void; allUsers: User[]; currentUserId: number }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<WishItem[] | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "", url: "" });
  const [adding, setAdding] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: child.first_name, last_name: child.last_name });
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingParent, setSavingParent] = useState(false);
  const isPrimary = child.parent_user_id === currentUserId;

  async function loadItems() {
    if (items !== null) return;
    setLoadingItems(true);
    childrenApi.getWishlist(child.id).then(setItems).finally(() => setLoadingItems(false));
  }

  function handleToggle() {
    setOpen((v) => {
      if (!v) loadItems();
      return !v;
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const data = new FormData();
      if (editForm.first_name) data.append("first_name", editForm.first_name);
      if (editForm.last_name) data.append("last_name", editForm.last_name);
      const updated = await childrenApi.update(child.id, data);
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAdding(true);
    try {
      const data = new FormData();
      data.append("name", addForm.name.trim());
      if (addForm.description.trim()) data.append("description", addForm.description.trim());
      if (addForm.url.trim()) data.append("url", addForm.url.trim());
      const item = await childrenApi.addWishItem(child.id, data);
      setItems((prev) => [item, ...(prev ?? [])]);
      setAddForm({ name: "", description: "", url: "" });
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteItem(itemId: number) {
    await childrenApi.deleteWishItem(child.id, itemId);
    setItems((prev) => prev?.filter((i) => i.id !== itemId) ?? prev);
  }

  function handleUpdateItem(updated: WishItem) {
    setItems((prev) => prev?.map((i) => (i.id === updated.id ? updated : i)) ?? prev);
  }

  async function handleAcceptSuggestion(itemId: number) {
    const updated = await childrenApi.acceptSuggestion(child.id, itemId);
    setItems((prev) => prev?.map((i) => (i.id === updated.id ? updated : i)) ?? prev);
  }

  async function handleRejectSuggestion(itemId: number) {
    await childrenApi.rejectSuggestion(child.id, itemId);
    setItems((prev) => prev?.filter((i) => i.id !== itemId) ?? prev);
  }

  async function handleSetSecondParent(userId: number | null) {
    setSavingParent(true);
    try {
      const updated = userId === null
        ? await childrenApi.removeSecondParent(child.id)
        : await childrenApi.setSecondParent(child.id, userId);
      onUpdated(updated);
    } finally {
      setSavingParent(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff" }}>
        {child.profile_image ? (
          <img src={child.profile_image} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#9ca3af", flexShrink: 0 }}>
            {child.first_name[0]}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{child.first_name} {child.last_name}</div>
          {items !== null && <div style={{ fontSize: 12, color: "#9ca3af" }}>{items.length} souhait{items.length !== 1 ? "s" : ""}</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setEditing((v) => !v)} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: editing ? "#ede9fe" : "#fff", color: editing ? "#4f46e5" : "#374151", cursor: "pointer" }}>
            Modifier
          </button>
          <button onClick={() => onDeleted(child.id)} style={{ fontSize: 12, padding: "4px 10px", border: "none", borderRadius: 6, background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}>
            Supprimer
          </button>
          <button onClick={handleToggle} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: open ? "#f0f0ff" : "#fff", color: open ? "#4f46e5" : "#374151", cursor: "pointer" }}>
            {open ? "▲ Souhaits" : "▼ Souhaits"}
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSaveEdit} style={{ padding: "10px 16px", background: "#f5f3ff", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 3 }}>Prénom</label>
            <input style={inputStyle} value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 3 }}>Nom</label>
            <input style={inputStyle} value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <button type="submit" style={{ ...btnPrimary, fontSize: 13 }} disabled={savingEdit}>{savingEdit ? "..." : "OK"}</button>
          <button type="button" onClick={() => setEditing(false)} style={{ ...btnPrimary, background: "#6b7280", fontSize: 13 }}>Annuler</button>
        </form>
      )}

      {open && (
        <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 16px" }}>
          {/* Second parent management — primary parent only */}
          {isPrimary && (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>2ème parent</div>
              {child.second_parent ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {child.second_parent.profile_image ? (
                    <img src={child.second_parent.profile_image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9ca3af" }}>
                      {child.second_parent.first_name[0]}
                    </div>
                  )}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                    {child.second_parent.first_name} {child.second_parent.last_name}
                  </span>
                  <button
                    onClick={() => handleSetSecondParent(null)}
                    disabled={savingParent}
                    style={{ fontSize: 12, padding: "3px 10px", border: "1px solid #fca5a5", borderRadius: 6, background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) handleSetSecondParent(Number(e.target.value)); }}
                    disabled={savingParent}
                    style={{ flex: 1, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#374151", background: "#fff" }}
                  >
                    <option value="" disabled>Associer un parent…</option>
                    {allUsers.filter((u) => u.id !== currentUserId).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                  {savingParent && <span style={{ fontSize: 12, color: "#9ca3af" }}>...</span>}
                </div>
              )}
            </div>
          )}

          {!isPrimary && child.second_parent_user_id === currentUserId && (
            <div style={{ marginBottom: 12, fontSize: 12, color: "#7c3aed", background: "#f5f3ff", padding: "6px 10px", borderRadius: 6 }}>
              Vous êtes le 2ème parent de cet enfant
            </div>
          )}

          {loadingItems ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>Chargement...</p>
          ) : (
            <>
              {/* Suggestions reçues */}
              {(items ?? []).filter((i) => i.suggested_by).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", marginBottom: 6 }}>
                    Suggestions reçues ({(items ?? []).filter((i) => i.suggested_by).length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(items ?? []).filter((i) => i.suggested_by).map((item) => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid #c4b5fd", borderRadius: 8, background: "#faf5ff" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>{item.name} ↗</a> : item.name}
                          </div>
                          {item.description && <div style={{ fontSize: 12, color: "#6b7280" }}>{item.description}</div>}
                          <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>
                            Suggéré par {item.suggested_by!.first_name} {item.suggested_by!.last_name}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          <button onClick={() => handleAcceptSuggestion(item.id)} style={{ padding: "4px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Accepter</button>
                          <button onClick={() => handleRejectSuggestion(item.id)} style={{ padding: "4px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Refuser</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Souhaits normaux */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(items ?? []).filter((i) => !i.suggested_by).map((item) => (
                  <ChildWishCard key={item.id} childId={child.id} item={item} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} />
                ))}
                {(items ?? []).filter((i) => !i.suggested_by).length === 0 && !showAddForm && (items ?? []).filter((i) => i.suggested_by).length === 0 && (
                  <p style={{ color: "#9ca3af", fontSize: 13, margin: "4px 0" }}>Aucun souhait.</p>
                )}
              </div>
            </>
          )}

          {showAddForm ? (
            <form onSubmit={handleAddItem} style={{ marginTop: 10, padding: "12px 14px", background: "#f0f0ff", borderRadius: 8, border: "1px solid #c7d2fe" }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#4f46e5", marginBottom: 8 }}>Ajouter un souhait</div>
              <input placeholder="Nom *" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required style={{ ...inputStyle, marginBottom: 6, fontSize: 13 }} />
              <input placeholder="Description (optionnel)" value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, marginBottom: 6, fontSize: 13 }} />
              <input placeholder="URL (optionnel)" type="url" value={addForm.url} onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))} style={{ ...inputStyle, marginBottom: 10, fontSize: 13 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: "6px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer" }}>Annuler</button>
                <button type="submit" disabled={adding} style={{ flex: 1, padding: "6px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{adding ? "..." : "Ajouter"}</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAddForm(true)} style={{ marginTop: 10, width: "100%", padding: "7px", border: "1px dashed #d1d5db", borderRadius: 8, background: "none", color: "#6b7280", cursor: "pointer", fontSize: 13 }}>
              + Ajouter un souhait
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Children section ─────────────────────────────────────────────────────────

function ChildrenSection() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([childrenApi.list(), usersApi.list()])
      .then(([kids, users]) => { setChildren(kids); setAllUsers(users); })
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const data = new FormData();
      data.append("first_name", form.first_name);
      data.append("last_name", form.last_name);
      if (imageFile) data.append("profile_image", imageFile);
      const child = await childrenApi.create(data);
      setChildren((prev) => [...prev, child]);
      setForm({ first_name: "", last_name: "" });
      setImageFile(null);
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    await childrenApi.delete(id);
    setChildren((prev) => prev.filter((c) => c.id !== id));
  }

  function handleUpdated(updated: Child) {
    setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  if (loading) return <p style={{ color: "#9ca3af" }}>Chargement...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: "#6b7280" }}>
          Enfants de {user?.first_name} — ils n'ont pas de compte
        </span>
        <button onClick={() => setShowForm((v) => !v)} style={btnPrimary}>
          {showForm ? "Annuler" : "+ Ajouter un enfant"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16, background: "#fafafa" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Prénom *</label>
              <input style={inputStyle} value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Nom *</label>
              <input style={inputStyle} value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Photo (optionnel)</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
          </div>
          <button type="submit" style={btnPrimary} disabled={adding}>{adding ? "Ajout..." : "Ajouter"}</button>
        </form>
      )}

      {children.length === 0 && !showForm ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "32px 0" }}>
          Aucun enfant ajouté. Ajoutez vos enfants pour gérer leurs listes de souhaits.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {children.map((child) => (
            <ChildPanel key={child.id} child={child} onUpdated={handleUpdated} onDeleted={handleDelete} allUsers={allUsers} currentUserId={user!.id} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "profile" | "wishlist" | "children" | "santa";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px",
    border: "none",
    borderBottom: active ? "2px solid #4f46e5" : "2px solid transparent",
    background: "none",
    fontWeight: active ? 600 : 400,
    color: active ? "#4f46e5" : "#6b7280",
    cursor: "pointer",
    fontSize: 15,
  });

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Mon espace</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Accueil</Link>
          {user?.is_admin && <Link to="/admin" style={{ fontSize: 13, color: "#4f46e5", textDecoration: "none" }}>Administration</Link>}
          <button onClick={logout} style={{ fontSize: 13, background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
        <button style={tabStyle(tab === "profile")} onClick={() => setTab("profile")}>Mon profil</button>
        <button style={tabStyle(tab === "wishlist")} onClick={() => setTab("wishlist")}>Mes souhaits</button>
        <button style={tabStyle(tab === "children")} onClick={() => setTab("children")}>Mes enfants</button>
        <button style={tabStyle(tab === "santa")} onClick={() => setTab("santa")}>🎅 Secret Santa</button>
      </div>

      {tab === "profile" && <ProfileSection />}
      {tab === "wishlist" && <WishlistSection />}
      {tab === "children" && <ChildrenSection />}
      {tab === "santa" && <SantaSection />}
    </div>
  );
}
