import { useState } from "react";
import { User } from "../api/client";
import { loadHistory } from "./types";
import { Card, Avatar } from "./ui";

const GAME_LABELS: Record<string, string> = { belote: "🃏 Belote", coinche: "🎯 Coinche", tarot: "🔮 Tarot", papayoo: "🎴 Papayoo" };

export default function StatsPage({ users }: { users: User[] }) {
  const history = loadHistory();
  const [filterGame, setFilterGame] = useState("all");
  const [filterPlayer, setFilterPlayer] = useState<number | "all">("all");

  const filtered = history.filter((r) =>
    (filterGame === "all" || r.game === filterGame) &&
    (filterPlayer === "all" || r.players.some((p) => p.id === filterPlayer))
  );

  const stats: Record<number, { name: string; avatar: string | null; games: number; wins: number }> = {};
  filtered.forEach((r) => {
    const best = r.lowWins ? Math.min(...r.scores) : Math.max(...r.scores);
    r.players.forEach((p, i) => {
      if (!stats[p.id]) stats[p.id] = { name: p.name, avatar: p.avatar, games: 0, wins: 0 };
      stats[p.id].games++;
      if (r.scores[i] === best) stats[p.id].wins++;
    });
  });

  const sorted = Object.entries(stats).map(([id, s]) => ({ id: +id, ...s, rate: s.games ? Math.round(s.wins / s.games * 100) : 0 })).sort((a, b) => b.rate - a.rate);
  const knownUsers = users.filter((u) => history.some((r) => r.players.some((p) => p.id === u.id)));

  if (history.length === 0) return (
    <Card style={{ textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 36 }}>📊</div>
      <div style={{ fontWeight: 600, color: "#374151", marginTop: 8 }}>Aucune partie enregistrée</div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Joue une partie et clique sur "Terminer"</div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Jeu</label>
            <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>
              <option value="all">Tous</option>
              {["belote", "coinche", "tarot", "papayoo"].map((g) => <option key={g} value={g}>{GAME_LABELS[g]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Joueur</label>
            <select value={filterPlayer} onChange={(e) => setFilterPlayer(e.target.value === "all" ? "all" : +e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>
              <option value="all">Tous</option>
              {knownUsers.map((u) => <option key={u.id} value={u.id}>{u.nickname || `${u.first_name} ${u.last_name}`}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtered.length} partie{filtered.length > 1 ? "s" : ""}</span>
        </div>
      </Card>

      {sorted.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Classement</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {sorted.map((s, rank) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: rank === 0 ? "#fefce8" : "#f9fafb", border: `1px solid ${rank === 0 ? "#fde68a" : "#e5e7eb"}` }}>
                <span style={{ width: 22, textAlign: "center" }}>{rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}</span>
                <Avatar player={{ id: s.id, name: s.name, avatar: s.avatar }} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{s.games} partie{s.games > 1 ? "s" : ""} · {s.wins} victoire{s.wins > 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 20, color: rank === 0 ? "#d97706" : "#374151" }}>{s.rate}%</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Historique</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r) => {
            const best = r.lowWins ? Math.min(...r.scores) : Math.max(...r.scores);
            const winner = r.players[r.scores.indexOf(best)];
            return (
              <div key={r.id} style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{GAME_LABELS[r.game] ?? r.game}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {r.players.map((p, i) => (
                    <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 12, background: r.scores[i] === best ? "#fefce8" : "#f3f4f6", border: `1px solid ${r.scores[i] === best ? "#fde68a" : "#e5e7eb"}`, fontWeight: r.scores[i] === best ? 700 : 400 }}>
                      <Avatar player={p} size={14} />{p.name.split(" ")[0]} · {r.scores[i]}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#d97706", marginTop: 5, fontWeight: 700 }}>🏆 {winner?.name}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
