import { useState } from "react";
import { User } from "../api/client";
import { GamePlayer } from "./types";

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, ...style }}>{children}</div>;
}

// ─── Btn ──────────────────────────────────────────────────────────────────────

export function Btn({ children, onClick, variant = "primary", disabled, style }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost"; disabled?: boolean; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = { border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity .15s" };
  const v = { primary: { background: "#4f46e5", color: "#fff" }, secondary: { background: "#f3f4f6", color: "#374151" }, danger: { background: "#fee2e2", color: "#991b1b" }, ghost: { background: "transparent", color: "#6b7280", border: "1px solid #e5e7eb" } as React.CSSProperties };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...style }}>{children}</button>;
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function Input({ value, onChange, placeholder, type = "text", style }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 12px", fontSize: 14, boxSizing: "border-box", width: "100%", ...style }} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({ player, size = 32 }: { player: GamePlayer; size?: number }) {
  if (player.avatar) return <img src={player.avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .4, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{player.name[0]?.toUpperCase()}</div>;
}

// ─── PlayerPicker ─────────────────────────────────────────────────────────────

export function PlayerPicker({ users, selected, onChange, min, max, exclude = [] }: {
  users: User[]; selected: GamePlayer[]; onChange: (p: GamePlayer[]) => void; min: number; max: number; exclude?: number[];
}) {
  const [freeInput, setFreeInput] = useState("");
  const nextFreeId = () => -(Date.now() % 1000000 + Math.floor(Math.random() * 1000));

  function toggle(u: User) {
    const name = u.nickname || `${u.first_name} ${u.last_name}`;
    const p: GamePlayer = { id: u.id, name, avatar: u.profile_image };
    const already = selected.find((x) => x.id === u.id);
    if (already) onChange(selected.filter((x) => x.id !== u.id));
    else if (selected.length < max) onChange([...selected, p]);
  }

  function addFree() {
    const name = freeInput.trim();
    if (!name || selected.length >= max) return;
    onChange([...selected, { id: nextFreeId(), name, avatar: null }]);
    setFreeInput("");
  }

  function removeFree(id: number) { onChange(selected.filter((p) => p.id !== id)); }

  const freeSelected = selected.filter((p) => p.id < 0);

  return (
    <div>
      <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 8 }}>Joueurs ({selected.length}/{max} · min {min})</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {users.filter((u) => !exclude.includes(u.id)).map((u) => {
          const name = u.nickname || `${u.first_name} ${u.last_name}`;
          const isSel = selected.some((p) => p.id === u.id);
          const isOff = !isSel && selected.length >= max;
          return (
            <button key={u.id} onClick={() => toggle(u)} disabled={isOff} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, border: "none", cursor: isOff ? "not-allowed" : "pointer", background: isSel ? "#eef2ff" : "#f9fafb", opacity: isOff ? 0.4 : 1, textAlign: "left" }}>
              {u.profile_image ? <img src={u.profile_image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: isSel ? "#4f46e5" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>{name[0]}</div>}
              <span style={{ fontWeight: 600, fontSize: 14, color: isSel ? "#4f46e5" : "#374151" }}>{name}</span>
              {isSel && <span style={{ marginLeft: "auto", color: "#4f46e5" }}>✓</span>}
            </button>
          );
        })}
        {freeSelected.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, background: "#eef2ff" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>{p.name[0]}</div>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#4f46e5", flex: 1 }}>{p.name}</span>
            <button onClick={() => removeFree(p.id)} style={{ border: "none", background: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
          </div>
        ))}
        {selected.length < max && (
          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            <input value={freeInput} onChange={(e) => setFreeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFree()}
              placeholder="Ajouter un joueur..." style={{ flex: 1, border: "1px dashed #d1d5db", borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none" }} />
            <button onClick={addFree} disabled={!freeInput.trim()} style={{ border: "none", background: "#4f46e5", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: freeInput.trim() ? "pointer" : "not-allowed", opacity: freeInput.trim() ? 1 : 0.4 }}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────

export function Scoreboard({ players, scores, lowWins = false }: { players: GamePlayer[]; scores: number[]; lowWins?: boolean }) {
  const sorted = [...players.map((p, i) => ({ p, s: scores[i] }))].sort((a, b) => lowWins ? a.s - b.s : b.s - a.s);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.map(({ p, s }, rank) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: rank === 0 ? "#fefce8" : "#f9fafb", border: `1px solid ${rank === 0 ? "#fde68a" : "#e5e7eb"}` }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}</span>
          <Avatar player={p} size={32} />
          <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontWeight: 800, fontSize: 20, color: rank === 0 ? "#d97706" : "#374151" }}>{s}</span>
        </div>
      ))}
    </div>
  );
}
