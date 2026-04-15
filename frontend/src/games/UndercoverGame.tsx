import { useState } from "react";
import { User } from "../api/client";
import { GamePlayer, saveResult } from "./types";
import { PlayerPicker, Avatar } from "./ui";

// ─── Paires de mots prédéfinies ────────────────────────────────────────────

const WORD_PAIRS = [
  ["Chat", "Chien"], ["Pizza", "Pasta"], ["Plage", "Piscine"],
  ["Café", "Thé"], ["Soleil", "Lune"], ["Avion", "Hélicoptère"],
  ["Cinéma", "Théâtre"], ["Football", "Rugby"], ["Sushi", "Sashimi"],
  ["Montagne", "Colline"], ["Guitare", "Violon"], ["Médecin", "Infirmier"],
  ["Chocolat", "Caramel"], ["Paris", "Londres"], ["Lion", "Tigre"],
  ["Voiture", "Moto"], ["Été", "Printemps"], ["Bière", "Vin"],
  ["Requin", "Dauphin"], ["Chemise", "Veste"], ["Roi", "Reine"],
  ["Boulanger", "Pâtissier"], ["Forêt", "Jungle"], ["Neige", "Grêle"],
  ["Vampire", "Loup-garou"], ["Mariage", "Fiançailles"], ["Téléphone", "Tablette"],
  ["Musée", "Galerie"], ["Astronaute", "Cosmonaute"], ["Ballon", "Balle"],
];

type Role = "civil" | "undercover" | "mrwhite";

function suggestConfig(nbPlayers: number): { nbUndercover: number; mrWhite: boolean } {
  if (nbPlayers <= 5) return { nbUndercover: 1, mrWhite: false };
  return { nbUndercover: 2, mrWhite: true };
}

// ─── Solo Game ────────────────────────────────────────────────────────────

interface SoloPlayer extends GamePlayer {
  role?: Role;
  word?: string;
  eliminated?: boolean;
  _guessing?: boolean;
}

function SoloGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [selectedPlayers, setSelectedPlayers] = useState<GamePlayer[]>([]);
  const [wordPair, setWordPair] = useState<[string, string] | null>(null);
  const [customWords, setCustomWords] = useState(false);
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [mrWhite, setMrWhite] = useState(false);
  const [nbUndercover, setNbUndercover] = useState(1);
  const [stage, setStage] = useState<"config" | "reveal" | "playing" | "mrwhite_guess" | "result">("config");
  const [players, setPlayers] = useState<SoloPlayer[]>([]);
  const [revealIdx, setRevealIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [result, setResult] = useState<{ winner: string; winners: SoloPlayer[] } | null>(null);

  function start() {
    const [wc, wu] = customWords ? [word1, word2] : wordPair!;
    const playerList: SoloPlayer[] = selectedPlayers.map((p) => ({ ...p }));
    const nbPlayersTotal = playerList.length;
    const nbUndercovers = Math.min(nbUndercover, nbPlayersTotal - 1);
    const needMrWhite = mrWhite && nbPlayersTotal > nbUndercovers + 1;

    const roles: Role[] = [
      ...Array(nbPlayersTotal - nbUndercovers - (needMrWhite ? 1 : 0)).fill("civil"),
      ...Array(nbUndercovers).fill("undercover"),
      ...(needMrWhite ? ["mrwhite" as Role] : []),
    ];

    const shuffled = roles.sort(() => Math.random() - 0.5);
    playerList.forEach((p, i) => {
      p.role = shuffled[i];
      p.word = p.role === "mrwhite" ? "???" : p.role === "undercover" ? wu : wc;
    });

    setPlayers(playerList);
    setWordPair(null);
    setStage("reveal");
    setRevealIdx(0);
    setRound(1);
  }

  if (stage === "config") {
    const suggestion = selectedPlayers.length > 0 ? suggestConfig(selectedPlayers.length) : { nbUndercover: 1, mrWhite: false };
    return (
      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>⚙️ Configuration</h2>

        <div>
          <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, display: "block", marginBottom: 8 }}>Joueurs (3–8)</label>
          <PlayerPicker users={users} selected={selectedPlayers} onChange={setSelectedPlayers} min={3} max={8} />
        </div>

        {selectedPlayers.length > 0 && (
          <>
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 4, display: "block" }}>Paires de mots</label>
              {!customWords ? (
                <>
                  <select
                    value={wordPair ? `${wordPair[0]}|${wordPair[1]}` : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [w1, w2] = e.target.value.split("|");
                        setWordPair([w1, w2]);
                      }
                    }}
                    style={{
                      width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, marginBottom: 8,
                    }}
                  >
                    <option value="">— Choisir une paire —</option>
                    {WORD_PAIRS.map((pair, i) => (
                      <option key={i} value={`${pair[0]}|${pair[1]}`}>{pair[0]} / {pair[1]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setCustomWords(true)}
                    style={{
                      width: "100%", padding: "8px", border: "1px dashed #d1d5db", background: "none", cursor: "pointer",
                      fontSize: 12, color: "#6b7280", borderRadius: 8,
                    }}
                  >
                    Ou saisir des mots personnalisés…
                  </button>
                </>
              ) : (
                <>
                  <input
                    value={word1} onChange={(e) => setWord1(e.target.value)} placeholder="Mot civil"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <input
                    value={word2} onChange={(e) => setWord2(e.target.value)} placeholder="Mot undercover"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <button
                    onClick={() => setCustomWords(false)}
                    style={{
                      width: "100%", padding: "8px", border: "1px dashed #d1d5db", background: "none", cursor: "pointer",
                      fontSize: 12, color: "#6b7280", borderRadius: 8,
                    }}
                  >
                    ← Utiliser une paire prédéfinie
                  </button>
                </>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={mrWhite} onChange={(e) => setMrWhite(e.target.checked)} />
                Mr. White (carte blanche)
              </label>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 4, display: "block" }}>
                Nombre d'undercovers (suggestion : {suggestion.nbUndercover})
              </label>
              <input
                type="number" min={1} max={selectedPlayers.length - 1} value={nbUndercover}
                onChange={(e) => setNbUndercover(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>

            <button
              onClick={start}
              disabled={!wordPair && (!customWords || !word1 || !word2)}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: !wordPair && (!customWords || !word1 || !word2) ? 0.5 : 1,
              }}
            >
              Commencer →
            </button>
          </>
        )}
      </div>
    );
  }

  if (stage === "reveal") {
    const p = players[revealIdx];
    return (
      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>🕵️ Révélation des rôles</h2>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Joueur {revealIdx + 1}/{players.length}
        </div>

        <div style={{ fontSize: 28, color: "#4f46e5", fontWeight: 800, marginBottom: 8 }}>
          {p?.name}
        </div>

        <div style={{
          background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24,
          textAlign: "center", width: "100%", minHeight: 200, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <button
            onClick={() => {}}
            style={{
              background: "#4f46e5", color: "#fff", border: "none", padding: "12px 24px",
              borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}
          >
            Voir mon mot
          </button>
          <div style={{
            background: "#fff", border: "2px solid #4f46e5", borderRadius: 10, padding: "20px 40px",
            fontSize: 32, fontWeight: 800, color: "#4f46e5", minWidth: 180, textAlign: "center",
          }}>
            {p?.word}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            Rôle : <strong style={{ color: p?.role === "civil" ? "#16a34a" : p?.role === "undercover" ? "#dc2626" : "#7c3aed" }}>
              {p?.role === "civil" ? "Civil" : p?.role === "undercover" ? "Undercover" : "Mr. White"}
            </strong>
          </div>
        </div>

        <button
          onClick={() => {
            if (revealIdx < players.length - 1) setRevealIdx(revealIdx + 1);
            else setStage("playing");
          }}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#f3f4f6",
            color: "#374151", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          {revealIdx < players.length - 1 ? "Joueur suivant →" : "Commencer la partie →"}
        </button>
      </div>
    );
  }

  if (stage === "playing") {
    const alive = players.filter((p) => !p.eliminated);
    const undercovers = alive.filter((p) => p.role === "undercover");
    const mrwhites = alive.filter((p) => p.role === "mrwhite");
    const civils = alive.filter((p) => p.role === "civil");
    const gameOver = !undercovers.length && !mrwhites.length || (alive.length <= 2 && (undercovers.length || mrwhites.length));

    function eliminate(p: SoloPlayer) {
      if (p.role === "mrwhite") {
        setStage("mrwhite_guess");
        setPlayers((prev) => prev.map((x) => x.id === p.id ? { ...x, _guessing: true } : x));
      } else {
        const updated = players.map((x) => x.id === p.id ? { ...x, eliminated: true } : x);
        setPlayers(updated);

        // Vérifier fin
        const aliveUpdated = updated.filter((x) => !x.eliminated);
        const uc = aliveUpdated.filter((x) => x.role === "undercover");
        const mw = aliveUpdated.filter((x) => x.role === "mrwhite");
        const c = aliveUpdated.filter((x) => x.role === "civil");
        const isOver = !uc.length && !mw.length || (aliveUpdated.length <= 2 && (uc.length || mw.length));

        if (isOver) {
          const winner = !uc.length && !mw.length ? "civils" : "undercover";
          const winners = winner === "civils" ? c : uc.concat(mw);
          setResult({ winner, winners });
          setStage("result");
        } else {
          setRound(round + 1);
        }
      }
    }

    return (
      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>Tour {round}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {alive.map((p) => (
            <button
              key={p.id}
              onClick={() => eliminate(p)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
                border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <Avatar player={p} size={32} />
              <span style={{ fontWeight: 600, flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Éliminer</span>
            </button>
          ))}
        </div>

        {gameOver && (
          <button
            onClick={() => {
              const w = !undercovers.length && !mrwhites.length ? civils : undercovers.concat(mrwhites);
              setResult({ winner: !undercovers.length && !mrwhites.length ? "civils" : "undercover", winners: w });
              setStage("result");
            }}
            style={{
              padding: "10px", borderRadius: 10, border: "1px solid #fde68a", background: "#fef9c3",
              color: "#854d0e", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8,
            }}
          >
            Partie terminée !
          </button>
        )}
      </div>
    );
  }

  if (stage === "mrwhite_guess") {
    const guessing = players.find((p) => (p as any)._guessing);
    const [guess, setGuess] = useState("");

    if (!guessing) return null;

    return (
      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>❓ {guessing.name}, devine le mot !</h2>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Tu as été éliminé. Peux-tu deviner le mot civil ?
        </div>
        <input
          value={guess} onChange={(e) => setGuess(e.target.value)}
          placeholder="Ton hypothèse…"
          style={{
            padding: "12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14,
            textAlign: "center", fontWeight: 700, boxSizing: "border-box",
          }}
        />
        <button
          onClick={() => {
            const wcivil = wordPair ? wordPair[0] : word1;
            const correct = guess.trim().toLowerCase() === wcivil.toLowerCase();

            if (correct) {
              setResult({ winner: "mrwhite", winners: [guessing] });
            } else {
              const updated = players.map((p) => p.id === guessing.id ? { ...p, eliminated: true, _guessing: false } : p);
              setPlayers(updated);
              const aliveUpdated = updated.filter((x) => !x.eliminated);
              const uc = aliveUpdated.filter((x) => x.role === "undercover");
              const mw = aliveUpdated.filter((x) => x.role === "mrwhite");
              const c = aliveUpdated.filter((x) => x.role === "civil");
              const isOver = !uc.length && !mw.length || (aliveUpdated.length <= 2 && (uc.length || mw.length));

              if (isOver) {
                const winner = !uc.length && !mw.length ? "civils" : "undercover";
                setResult({ winner, winners: winner === "civils" ? c : uc.concat(mw) });
              } else {
                setRound(round + 1);
              }
            }

            setStage("result");
          }}
          style={{
            padding: "12px", borderRadius: 10, border: "none", background: "#4f46e5",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          Soumettre
        </button>
      </div>
    );
  }

  if (stage === "result" && result) {
    const scores = players.map((p) => result.winners.some((w) => w.id === p.id) ? 1 : 0);

    function save() {
      saveResult({
        id: Date.now().toString(),
        game: "undercover",
        date: new Date().toISOString(),
        players: selectedPlayers,
        scores,
        lowWins: false,
      });
      onDone();
    }

    return (
      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, textAlign: "center" }}>
          {result.winner === "civils" ? "🎉 Les civils ont gagné !" : result.winner === "undercover" ? "🎭 L'undercover a gagné !" : "🤐 Mr. White a deviné !"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {players.map((p) => {
            const won = result.winners.some((w) => w.id === p.id);
            return (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
                  background: won ? "#dcfce7" : "#f9fafb", border: `1px solid ${won ? "#86efac" : "#e5e7eb"}`,
                }}
              >
                <Avatar player={p} size={28} />
                <span style={{ fontWeight: 600, flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {p.role === "civil" ? "Civil" : p.role === "undercover" ? "Undercover" : "Mr. White"}
                </span>
                {won && <span style={{ fontSize: 16 }}>✓</span>}
              </div>
            );
          })}
        </div>

        <button
          onClick={save}
          style={{
            padding: "12px", borderRadius: 10, border: "none", background: "#4f46e5",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8,
          }}
        >
          Enregistrer et quitter
        </button>
        <button
          onClick={() => {
            setStage("config");
            setSelectedPlayers([]);
            setWordPair(null);
            setCustomWords(false);
            setWord1("");
            setWord2("");
            setMrWhite(false);
            setNbUndercover(1);
          }}
          style={{
            padding: "8px", borderRadius: 10, border: "none", background: "none",
            cursor: "pointer", fontSize: 13, color: "#9ca3af",
          }}
        >
          ← Nouvelle partie
        </button>
      </div>
    );
  }

  return null;
}

// ─── Multi Lobby ──────────────────────────────────────────────────────────

function MultiLobby({ onJoin, onBack }: { onJoin: (code: string) => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/undercover/rooms", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCode(data.code);
    } catch {
      setError("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    const c = joinCode.trim().toUpperCase();
    if (c.length < 4) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/undercover/rooms/${c}`, { credentials: "include" });
      if (!res.ok) throw new Error("Partie introuvable");
      onJoin(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 4px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>🌐 Multijoueur</h2>
      <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
        Chaque joueur joue sur son propre téléphone, les rôles sont synchronisés en temps réel.
      </p>

      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#166534", marginBottom: 10 }}>
          Créer une nouvelle partie
        </div>
        {code ? (
          <>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
              Partage ce code avec les autres joueurs :
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: "#16a34a", textAlign: "center", padding: "10px 0" }}>
              {code}
            </div>
            <button
              onClick={() => onJoin(code)}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#16a34a",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              Rejoindre ma partie →
            </button>
          </>
        ) : (
          <button
            onClick={createRoom} disabled={loading}
            style={{
              width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#16a34a",
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "..." : "Créer une partie"}
          </button>
        )}
      </div>

      <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e40af", marginBottom: 10 }}>
          Rejoindre une partie existante
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            placeholder="Code (ex: A1B2C3)"
            maxLength={6}
            style={{
              flex: 1, border: "1.5px solid #93c5fd", borderRadius: 8, padding: "10px 12px", fontSize: 16,
              fontWeight: 700, letterSpacing: 2, textAlign: "center", outline: "none", textTransform: "uppercase",
            }}
          />
          <button
            onClick={joinRoom} disabled={loading || joinCode.length < 4}
            style={{
              padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: joinCode.length < 4 ? 0.5 : 1,
            }}
          >
            →
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: 13, textAlign: "center" }}>{error}</div>}

      <button
        onClick={onBack}
        style={{ padding: "8px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af" }}
      >
        ← Retour
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

type Mode = "setup" | "solo" | "multi-lobby" | "multi";

export default function UndercoverGame({ users, onDone, currentUser: _currentUser }: {
  users: User[];
  onDone: () => void;
  currentUser: User;
}) {
  const [mode, setMode] = useState<Mode>("setup");
  const [roomCode, setRoomCode] = useState("");

  if (mode === "solo") {
    return <SoloGame users={users} onDone={onDone} />;
  }

  if (mode === "multi-lobby") {
    return (
      <MultiLobby
        onJoin={(code) => { setRoomCode(code); setMode("multi"); }}
        onBack={() => setMode("setup")}
      />
    );
  }

  if (mode === "multi" && roomCode) {
    return <div style={{ padding: "0 4px" }}>Mode multijoueur — en construction</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 4px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>🕵️ Undercover</h2>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b7280" }}>
        Les civils doivent trouver qui est l'undercover. L'undercover gagne s'il ne se fait pas attraper.
      </p>

      <button
        onClick={() => setMode("solo")}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 12, border: "1px solid #e5e7eb",
          background: "#fff", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 28 }}>👤</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Solo</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Sur cet appareil · passe-le entre les joueurs</div>
        </div>
        <span style={{ marginLeft: "auto", color: "#9ca3af" }}>→</span>
      </button>

      <button
        onClick={() => setMode("multi-lobby")}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 12, border: "1px solid #e5e7eb",
          background: "#fff", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 28 }}>🌐</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Multijoueur</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Chaque joueur sur son téléphone · temps réel</div>
        </div>
        <span style={{ marginLeft: "auto", color: "#9ca3af" }}>→</span>
      </button>

      <button
        onClick={onDone}
        style={{
          padding: "8px", borderRadius: 10, border: "none", background: "none", cursor: "pointer",
          fontSize: 13, color: "#9ca3af", marginTop: 4,
        }}
      >
        ← Retour aux jeux
      </button>
    </div>
  );
}
