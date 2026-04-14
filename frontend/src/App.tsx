import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { santaUserApi, usersApi, reservationsApi, MyAssignment, MyReservation, PublicWishItem } from "./api/client";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import AdminSantaDetail from "./pages/AdminSantaDetail";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import PersonalPage from "./pages/PersonalPage";
import GamesPage from "./pages/GamesPage";

// ─── Bouton réservation pour la wishlist Secret Santa ─────────────────────────

function ReserveBadge({ item, assignedToId, currentUserId, onToggle }: {
  item: PublicWishItem;
  assignedToId: number;
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
        ? await usersApi.unreserve(assignedToId, item.id)
        : await usersApi.reserve(assignedToId, item.id);
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

// ─── Carte Secret Santa avec wishlist + réservations ─────────────────────────

function SantaCard({ assignment, currentUserId }: { assignment: MyAssignment; currentUserId: number }) {
  const [items, setItems] = useState<PublicWishItem[] | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleToggle() {
    if (!expanded && items === null) {
      setLoadingItems(true);
      try {
        const data = await usersApi.getWishlist(assignment.assigned_to.id);
        setItems(data);
      } finally {
        setLoadingItems(false);
      }
    }
    setExpanded((v) => !v);
  }

  function handleReserveToggle(updated: PublicWishItem) {
    setItems((prev) => prev?.map((i) => i.id === updated.id ? updated : i) ?? prev);
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: "#4f46e5", padding: "10px 16px", color: "#fff", fontWeight: 700 }}>
        {assignment.santa_name}
      </div>
      <div style={{ padding: "14px 16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>Vous offrez un cadeau à :</p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          {assignment.assigned_to.profile_image ? (
            <img src={assignment.assigned_to.profile_image} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#9ca3af" }}>
              {assignment.assigned_to.first_name[0]}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {assignment.assigned_to.first_name} {assignment.assigned_to.last_name}
            </div>
            {assignment.assigned_to.nickname && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>« {assignment.assigned_to.nickname} »</div>
            )}
          </div>
          <button
            onClick={handleToggle}
            style={{ fontSize: 13, padding: "5px 14px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#374151" }}
          >
            {expanded ? "Masquer" : "Voir la liste"}
          </button>
        </div>

        {expanded && (
          <>
            {loadingItems ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Chargement...</p>
            ) : !items || items.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Aucun souhait renseigné.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#f9fafb", borderRadius: 6 }}>
                    {item.image && <img src={item.image} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {item.url
                          ? <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>{item.name} ↗</a>
                          : item.name}
                      </div>
                      {item.description && <div style={{ fontSize: 12, color: "#6b7280" }}>{item.description}</div>}
                    </div>
                    <ReserveBadge
                      item={item}
                      assignedToId={assignment.assigned_to.id}
                      currentUserId={currentUserId}
                      onToggle={handleReserveToggle}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Encart cadeaux réservés ──────────────────────────────────────────────────

function MyReservationsCard() {
  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reservationsApi.mine().then(setReservations).finally(() => setLoading(false));
  }, []);

  async function handleTogglePurchased(id: number) {
    const updated = await reservationsApi.togglePurchased(id);
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  if (loading || reservations.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 17 }}>🎁 Mes cadeaux réservés</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {reservations.map((r) => (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 8,
            background: r.purchased ? "#f0fdf4" : "#fff",
            opacity: r.purchased ? 0.85 : 1,
          }}>
            {r.wish_item_image ? (
              <img src={r.wish_item_image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
            ) : r.owner_profile_image ? (
              <img src={r.owner_profile_image} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#9ca3af", flexShrink: 0 }}>
                {r.owner_first_name[0]}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, textDecoration: r.purchased ? "line-through" : "none", color: r.purchased ? "#6b7280" : "inherit" }}>
                {r.wish_item_url
                  ? <a href={r.wish_item_url} target="_blank" rel="noopener noreferrer" style={{ color: r.purchased ? "#6b7280" : "#4f46e5", textDecoration: "inherit" }}>{r.wish_item_name} ↗</a>
                  : r.wish_item_name
                }
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Pour {r.owner_first_name} {r.owner_last_name}
              </div>
            </div>

            <button
              onClick={() => handleTogglePurchased(r.id)}
              style={{
                fontSize: 12, padding: "4px 12px", borderRadius: 20, border: "none",
                background: r.purchased ? "#d1fae5" : "#f3f4f6",
                color: r.purchased ? "#065f46" : "#374151",
                fontWeight: 600, cursor: "pointer", flexShrink: 0,
              }}
            >
              {r.purchased ? "✓ Acheté" : "Marquer acheté"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page d'accueil ───────────────────────────────────────────────────────────

function HomePage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);

  useEffect(() => {
    santaUserApi.mine().then(setAssignments).catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: "32px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      {/* Profil */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px", background: "#f9fafb", borderRadius: 8, marginBottom: 32 }}>
        {user?.profile_image ? (
          <img src={user.profile_image} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#9ca3af" }}>
            {user?.first_name[0]}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            Bonjour, {user?.first_name} {user?.last_name}
            {user?.nickname && <span style={{ fontWeight: 400, color: "#6b7280" }}> « {user.nickname} »</span>}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{user?.email}</div>
        </div>
      </div>

      {/* Cadeaux réservés */}
      <MyReservationsCard />

      {/* Secret Santa */}
      {assignments.length > 0 && (
        <>
          <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>🎅 Mes Secret Santa</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {assignments.map((a) => (
              <SantaCard key={a.santa_id} assignment={a} currentUserId={user!.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><UsersPage /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
          <Route path="/games" element={<ProtectedRoute><Layout><GamesPage /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><Layout><AdminPage /></Layout></ProtectedRoute>} />
          <Route path="/admin/santa/:id" element={<ProtectedRoute requireAdmin><Layout><AdminSantaDetail /></Layout></ProtectedRoute>} />
          <Route path="/perso" element={<ProtectedRoute requireAdmin><Layout><PersonalPage /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
