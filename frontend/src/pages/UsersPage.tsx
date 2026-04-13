import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usersApi, User, PublicWishItem, Child } from "../api/client";

function ReserveBadge({ item, currentUserId, onToggle }: {
  item: PublicWishItem;
  currentUserId: number;
  onToggle: (updated: PublicWishItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const reservedByMe = item.reserved_by?.id === currentUserId;
  const reservedByOther = item.reserved_by && !reservedByMe;

  async function handleClick() {
    if (reservedByOther) return;
    setLoading(true);
    try {
      const updated = reservedByMe
        ? await usersApi.unreserve(item.user_id, item.id)
        : await usersApi.reserve(item.user_id, item.id);
      onToggle(updated);
    } finally {
      setLoading(false);
    }
  }

  if (reservedByOther) {
    return (
      <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#fef3c7", color: "#92400e", fontWeight: 600, flexShrink: 0 }}>
        Réservé par {item.reserved_by!.first_name}
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        fontSize: 12, padding: "4px 12px", borderRadius: 20, border: "none",
        background: reservedByMe ? "#d1fae5" : "#f3f4f6",
        color: reservedByMe ? "#065f46" : "#374151",
        fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
        flexShrink: 0, opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "..." : reservedByMe ? "✓ Réservé par moi" : "Réserver"}
    </button>
  );
}

function SuggestForm({ userId, recipientName, onAdded }: { userId: number; recipientName: string; onAdded: (item: PublicWishItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [visibleToRecipient, setVisibleToRecipient] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      if (description.trim()) form.append("description", description.trim());
      if (url.trim()) form.append("url", url.trim());
      form.append("visible_to_recipient", visibleToRecipient ? "true" : "false");
      const item = await usersApi.suggest(userId, form);
      onAdded(item);
      setName(""); setDescription(""); setUrl(""); setVisibleToRecipient(true);
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: 10, width: "100%", padding: "8px", border: "1px dashed #d1d5db",
          borderRadius: 8, background: "none", color: "#6b7280", cursor: "pointer", fontSize: 13,
        }}
      >
        + Suggérer un cadeau
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10, padding: "12px 14px", background: "#f0f0ff", borderRadius: 8, border: "1px solid #c7d2fe" }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#4f46e5", marginBottom: 8 }}>Suggérer un cadeau</div>
      {error && <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 8px" }}>{error}</p>}
      <input
        placeholder="Nom du cadeau *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ display: "block", width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, marginBottom: 6, boxSizing: "border-box" }}
      />
      <input
        placeholder="Description (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ display: "block", width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, marginBottom: 6, boxSizing: "border-box" }}
      />
      <input
        placeholder="URL (optionnel)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ display: "block", width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, marginBottom: 10, boxSizing: "border-box" }}
      />
      {/* Visibility toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setVisibleToRecipient(true)}
          style={{
            flex: 1, padding: "7px 6px", borderRadius: 8, border: "2px solid",
            borderColor: visibleToRecipient ? "#4f46e5" : "#e5e7eb",
            background: visibleToRecipient ? "#ede9fe" : "#fff",
            cursor: "pointer", fontSize: 12, textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 600, color: visibleToRecipient ? "#4f46e5" : "#6b7280" }}>Visible par {recipientName}</div>
          <div style={{ color: "#9ca3af", marginTop: 2 }}>Il/elle peut accepter ou refuser</div>
        </button>
        <button
          type="button"
          onClick={() => setVisibleToRecipient(false)}
          style={{
            flex: 1, padding: "7px 6px", borderRadius: 8, border: "2px solid",
            borderColor: !visibleToRecipient ? "#f59e0b" : "#e5e7eb",
            background: !visibleToRecipient ? "#fffbeb" : "#fff",
            cursor: "pointer", fontSize: 12, textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 600, color: !visibleToRecipient ? "#b45309" : "#6b7280" }}>Caché à {recipientName}</div>
          <div style={{ color: "#9ca3af", marginTop: 2 }}>Surprise — les autres peuvent réserver</div>
        </button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: "6px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13 }}>
          Annuler
        </button>
        <button type="submit" disabled={loading} style={{ flex: 1, padding: "6px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          {loading ? "..." : "Suggérer"}
        </button>
      </div>
    </form>
  );
}

function ChildSuggestForm({ userId, childId, onAdded }: { userId: number; childId: number; onAdded: (item: PublicWishItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      if (description.trim()) form.append("description", description.trim());
      if (url.trim()) form.append("url", url.trim());
      const item = await usersApi.suggestForChild(userId, childId, form);
      onAdded(item);
      setName(""); setDescription(""); setUrl("");
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ marginTop: 8, width: "100%", padding: "7px", border: "1px dashed #c4b5fd", borderRadius: 8, background: "none", color: "#7c3aed", cursor: "pointer", fontSize: 12 }}
      >
        + Suggérer un cadeau
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8, padding: "10px 12px", background: "#f5f3ff", borderRadius: 8, border: "1px solid #c4b5fd" }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: "#7c3aed", marginBottom: 6 }}>Suggérer un cadeau</div>
      {error && <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 6px" }}>{error}</p>}
      <input placeholder="Nom du cadeau *" value={name} onChange={(e) => setName(e.target.value)} required style={{ display: "block", width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, marginBottom: 5, boxSizing: "border-box" }} />
      <input placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} style={{ display: "block", width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, marginBottom: 5, boxSizing: "border-box" }} />
      <input placeholder="URL (optionnel)" value={url} onChange={(e) => setUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: "5px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer" }}>Annuler</button>
        <button type="submit" disabled={loading} style={{ flex: 1, padding: "5px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{loading ? "..." : "Suggérer"}</button>
      </div>
    </form>
  );
}

function ChildWishlistPanel({ userId, child, currentUserId }: { userId: number; child: Child; currentUserId: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PublicWishItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setOpen((v) => {
      if (!v && items === null) {
        setLoading(true);
        usersApi.getChildWishlist(userId, child.id).then(setItems).finally(() => setLoading(false));
      }
      return !v;
    });
  }

  function handleToggleReserve(updated: PublicWishItem) {
    setItems((prev) => prev?.map((i) => (i.id === updated.id ? updated : i)) ?? prev);
  }

  function handleSuggested(item: PublicWishItem) {
    setItems((prev) => [item, ...(prev ?? [])]);
  }

  const isParent = currentUserId === child.parent_user_id || currentUserId === child.second_parent_user_id;

  return (
    <div style={{ border: "1px solid #e0d9f7", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
      <button
        onClick={handleToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f5f3ff", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        {child.profile_image ? (
          <img src={child.profile_image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#7c3aed", flexShrink: 0 }}>
            {child.first_name[0]}
          </div>
        )}
        <span style={{ flex: 1, fontWeight: 500, fontSize: 13, color: "#4f46e5" }}>
          {child.first_name} {child.last_name}
        </span>
        <span style={{ color: "#9ca3af", fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none" }}>›</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #e0d9f7", padding: "10px 14px", background: "#faf5ff" }}>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>Chargement...</p>
          ) : !items || items.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>Aucun souhait renseigné.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", background: item.suggested_by ? "#f5f3ff" : "#fff", borderRadius: 8 }}>
                  {item.image && <img src={item.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>{item.name} ↗</a> : item.name}
                    </div>
                    {item.description && <div style={{ fontSize: 12, color: "#6b7280" }}>{item.description}</div>}
                    {item.suggested_by && (
                      <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 2, fontStyle: "italic" }}>
                        Suggéré par {item.suggested_by.first_name} {item.suggested_by.last_name}
                      </div>
                    )}
                  </div>
                  <ReserveBadge item={item} currentUserId={currentUserId} onToggle={handleToggleReserve} />
                </div>
              ))}
            </div>
          )}
          {!isParent && (
            <ChildSuggestForm userId={userId} childId={child.id} onAdded={handleSuggested} />
          )}
        </div>
      )}
    </div>
  );
}

function WishlistPanel({ user, currentUserId }: { user: User; currentUserId: number }) {
  const [items, setItems] = useState<PublicWishItem[] | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      usersApi.getWishlist(user.id),
      usersApi.getChildren(user.id),
    ]).then(([wishItems, kids]) => {
      setItems(wishItems);
      setChildren(kids);
    }).finally(() => setLoading(false));
  }, [user.id]);

  function handleToggle(updated: PublicWishItem) {
    setItems((prev) => prev?.map((i) => i.id === updated.id ? updated : i) ?? prev);
  }

  function handleSuggested(item: PublicWishItem) {
    setItems((prev) => [item, ...(prev ?? [])]);
  }

  if (loading) return <p style={{ padding: "12px 16px", color: "#9ca3af", fontSize: 13 }}>Chargement...</p>;

  return (
    <div style={{ padding: "0 16px 16px" }}>
      {!items || items.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 13, margin: "12px 0" }}>Aucun souhait renseigné.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: item.suggested_by ? "#f5f3ff" : "#f9fafb", borderRadius: 8 }}>
              {item.image && (
                <img src={item.image} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {item.url
                    ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>{item.name} ↗</a>
                    : item.name
                  }
                </div>
                {item.description && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.description}</div>}
                {item.suggested_by && (
                  <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 3, fontStyle: "italic" }}>
                    Suggéré par {item.suggested_by.first_name} {item.suggested_by.last_name}
                  </div>
                )}
              </div>
              <ReserveBadge item={item} currentUserId={currentUserId} onToggle={handleToggle} />
            </div>
          ))}
        </div>
      )}
      <SuggestForm userId={user.id} recipientName={user.first_name} onAdded={handleSuggested} />

      {children.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Enfants
          </div>
          {children.map((child) => (
            <ChildWishlistPanel key={child.id} userId={user.id} child={child} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    usersApi.list().then(setUsers).finally(() => setLoading(false));
  }, []);

  function toggleUser(id: number) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Listes de souhaits</h1>
        <Link to="/" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← Accueil</Link>
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Chargement...</p>
      ) : users.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "40px 0" }}>Aucun autre utilisateur.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {users.map((u) => (
            <div key={u.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <button
                onClick={() => toggleUser(u.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px", background: "#fff", border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                {u.profile_image ? (
                  <img src={u.profile_image} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#9ca3af", flexShrink: 0 }}>
                    {u.first_name[0]}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {u.first_name} {u.last_name}
                    {u.nickname && <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 13 }}> « {u.nickname} »</span>}
                  </div>
                </div>
                <span style={{ color: "#9ca3af", fontSize: 18, transition: "transform 0.2s", transform: openId === u.id ? "rotate(90deg)" : "none" }}>
                  ›
                </span>
              </button>

              {openId === u.id && (
                <div style={{ borderTop: "1px solid #f3f4f6" }}>
                  <WishlistPanel user={u} currentUserId={user!.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
