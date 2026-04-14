import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = (isAdmin: boolean) => [
  { to: "/",       label: "Accueil",  icon: "🏠" },
  { to: "/users",  label: "Listes",   icon: "🎁" },
  { to: "/games",  label: "Jeux",     icon: "🃏" },
  ...(isAdmin ? [
    { to: "/perso",  label: "Perso",    icon: "🎭" },
    { to: "/admin",  label: "Admin",    icon: "⚙️" },
  ] : []),
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  if (!user) return null;

  const links = NAV_LINKS(user.is_admin);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        height: 56, display: "flex", alignItems: "center",
        padding: "0 20px", gap: 8,
      }}>
        {/* Logo */}
        <Link to="/" style={{ fontWeight: 800, fontSize: 17, color: "#4f46e5", textDecoration: "none", marginRight: 12, whiteSpace: "nowrap" }}>
          👨‍👩‍👧‍👦 Famille
        </Link>

        {/* Links – desktop */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8,
                fontSize: 14, fontWeight: isActive(l.to) ? 700 : 500,
                color: isActive(l.to) ? "#4f46e5" : "#374151",
                background: isActive(l.to) ? "#eef2ff" : "transparent",
                textDecoration: "none",
                transition: "background 0.15s",
              }}
            >
              <span>{l.icon}</span>
              <span className="nav-label">{l.label}</span>
            </Link>
          ))}
        </div>

        {/* User area */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "4px 8px", borderRadius: 8 }}>
            {user.profile_image ? (
              <img src={user.profile_image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>
                {user.first_name[0]}
              </div>
            )}
            <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }} className="nav-label">{user.first_name}</span>
          </Link>
          <button
            onClick={logout}
            style={{ fontSize: 13, padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#6b7280", fontWeight: 500 }}
          >
            <span className="nav-label">Déconnexion</span>
            <span className="nav-icon" style={{ display: "none" }}>⏻</span>
          </button>
        </div>
      </nav>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 520px) {
          .nav-label { display: none !important; }
          .nav-icon { display: inline !important; }
        }
      `}</style>
    </>
  );
}
