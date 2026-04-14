import { useState, useEffect } from "react";
import { usersApi, User } from "../api/client";
import { GameType } from "../games/types";
import BeloteGame from "../games/BeloteGame";
import CoincheGame from "../games/CoincheGame";
import TarotGame from "../games/TarotGame";
import PapayooGame from "../games/PapayooGame";
import QwixxGame from "../games/QwixxGame";
import StatsPage from "../games/StatsPage";

const GAMES_LIST = [
  { id: "belote"  as GameType, label: "Belote",   icon: "🃏", desc: "2 équipes · Annonces + Belote/Rebelote" },
  { id: "coinche" as GameType, label: "Coinche",  icon: "🎯", desc: "2 équipes · Contrat + Coinche/Surcoinche" },
  { id: "tarot"   as GameType, label: "Tarot",    icon: "🔮", desc: "3–5 joueurs · Poignée · Petit au bout · Chelem" },
  { id: "papayoo" as GameType, label: "Papayoo",  icon: "🎴", desc: "3–6 joueurs · Le moins de points gagne" },
  { id: "qwixx"   as GameType, label: "Qwixx",    icon: "🎲", desc: "2–5 joueurs · Cochez de gauche à droite · Score auto" },
];

const ICONS: Record<GameType, string> = { belote: "🃏", coinche: "🎯", tarot: "🔮", papayoo: "🎴", qwixx: "🎲" };

export default function GamesPage() {
  const [selected, setSelected] = useState<GameType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<"games" | "stats">("games");

  useEffect(() => { usersApi.list().then(setUsers).catch(() => {}); }, []);

  function back() { setSelected(null); }

  if (selected) return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <button onClick={back} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 14, padding: 0 }}>← Retour</button>
      <h1 style={{ margin: "0 0 18px", fontSize: 22 }}>{ICONS[selected]} {selected.charAt(0).toUpperCase() + selected.slice(1)}</h1>
      {selected === "belote"  && <BeloteGame  users={users} onDone={back} />}
      {selected === "coinche" && <CoincheGame users={users} onDone={back} />}
      {selected === "tarot"   && <TarotGame   users={users} onDone={back} />}
      {selected === "papayoo" && <PapayooGame users={users} onDone={back} />}
      {selected === "qwixx"   && <QwixxGame   users={users} onDone={back} />}
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>🎲 Jeux</h1>
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #e5e7eb" }}>
        {[{ id: "games", label: "Jeux" }, { id: "stats", label: "📊 Stats" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as "games" | "stats")} style={{ padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "#4f46e5" : "#6b7280", borderBottom: `2px solid ${tab === t.id ? "#4f46e5" : "transparent"}`, marginBottom: -1 }}>{t.label}</button>
        ))}
      </div>
      {tab === "games" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GAMES_LIST.map((g) => (
            <button key={g.id} onClick={() => setSelected(g.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
              <span style={{ fontSize: 30 }}>{g.icon}</span>
              <div><div style={{ fontWeight: 700, fontSize: 16 }}>{g.label}</div><div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{g.desc}</div></div>
              <span style={{ marginLeft: "auto", color: "#9ca3af" }}>→</span>
            </button>
          ))}
        </div>
      )}
      {tab === "stats" && <StatsPage users={users} />}
    </div>
  );
}
