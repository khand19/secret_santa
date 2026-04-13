import { useState, useCallback } from "react";
import { Link } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "confessions" | "gage" | "defis" | "autre";
type Mode = "soft" | "hard";

interface CategoryConfig {
  label: string;
  emoji: string;
  color: string;
  gradient: string;
  soft: string;
  hard: string;
}

// ─── Config (défauts minimalistes — les vrais textes sont dans localStorage) ──

const CATEGORIES: Record<Category, CategoryConfig> = {
  confessions: {
    label: "Confessions",
    emoji: "🤫",
    color: "#7c3aed",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    soft: `As-tu déjà eu le béguin pour quelqu’un ici présent ? As-tu déjà menti sur ton nombre de partenaires ? As-tu déjà flirté avec le partenaire d’un ami ?`,
    hard: `As-tu déjà simulé un orgasme ? As-tu déjà couché avec quelqu’un rencontré le soir même ? As-tu déjà eu une aventure pendant une relation ?`,
  },
  gage: {
    label: "Gage",
    emoji: "🎭",
    color: "#b45309",
    gradient: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    soft: `Faire un massage des épaules à la personne de ton choix. Chuchoter un compliment à l’oreille de la personne à ta gauche. Faire un câlin de 20 secondes à la personne de ton choix.`,
    hard: `Embrasser la personne de ton choix. Faire le tour de la pièce en sous-vêtements. Faire un body shot sur la personne de ton choix.`,
  },
  defis: {
    label: "Défis",
    emoji: "🏆",
    color: "#0369a1",
    gradient: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    soft: `Envoyer un message flirt à quelqu’un dans ton téléphone. Montrer la dernière photo prise sur ton téléphone. Laisser la personne à ta gauche écrire un message depuis ton téléphone.`,
    hard: `Appeler ton ex et lui dire que tu penses encore à lui/elle. Décrire en détail ta nuit la plus torride. Laisser le groupe choisir une photo à envoyer depuis ton téléphone.`,
  },
  autre: {
    label: "Autre",
    emoji: "✨",
    color: "#374151",
    gradient: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    soft: `Quelle célébrité te fait le plus craquer ? Décris ton type physique idéal. Quel est ton plus beau souvenir de flirt ?`,
    hard: `Quel est ton fantasme inavoué ? Quelle est ta position préférée ? Quel est l’endroit le plus fou où tu as fait l’amour ?`,
  },
};

const STORAGE_KEY = "perso_texts_v1";

const PLAYER_COLORS = ["#4f46e5", "#0369a1", "#7c3aed", "#b45309", "#065f46", "#9d174d", "#1e40af", "#92400e"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSentences(text: string): string[] {
  return text.split(/[.?!]+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function pickRandom(sentences: string[]): string {
  if (sentences.length === 0) return "Aucun message trouvé.";
  return sentences[Math.floor(Math.random() * sentences.length)];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonalPage() {
  // ── Setup vs Play ──
  const [phase, setPhase] = useState<"setup" | "play">("setup");

  // ── Players ──
  const [players, setPlayers] = useState<string[]>(["Joueur 1", "Joueur 2"]);
  const [newPlayer, setNewPlayer] = useState("");
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);

  // ── Mode & categories ──
  const [mode, setMode] = useState<Mode>("soft");
  const [selected, setSelected] = useState<Set<Category>>(new Set(["confessions"]));

  // ── Texts (editable, persistés dans localStorage) ──
  const [texts, setTexts] = useState<Record<Category, Record<Mode, string>>>(() => {
    const defaults = Object.fromEntries(
      (Object.keys(CATEGORIES) as Category[]).map((k) => [
        k,
        { soft: CATEGORIES[k].soft, hard: CATEGORIES[k].hard },
      ])
    ) as Record<Category, Record<Mode, string>>;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
  });

  function saveTexts(updated: Record<Category, Record<Mode, string>>) {
    setTexts(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }

  // ── Current message ──
  const [currentCat, setCurrentCat] = useState<Category>("confessions");
  const [message, setMessage] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingMode, setEditingMode] = useState<Mode>("soft");
  const [draft, setDraft] = useState("");

  function drawMessage(
    sel: Set<Category>,
    m: Mode,
    t: Record<Category, Record<Mode, string>>,
  ) {
    if (sel.size === 0) return;
    const cats = Array.from(sel) as Category[];
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const sentences = parseSentences(t[cat][m]);
    setCurrentCat(cat);
    setMessage(pickRandom(sentences));
  }

  function handleStart() {
    if (players.length < 1) return;
    setCurrentPlayerIdx(0);
    drawMessage(selected, mode, texts);
    setPhase("play");
  }

  const handleNext = useCallback(() => {
    const nextIdx = (currentPlayerIdx + 1) % players.length;
    setCurrentPlayerIdx(nextIdx);
    drawMessage(selected, mode, texts);
  }, [currentPlayerIdx, players, selected, mode, texts]);

  function toggleCategory(cat: Category) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size === 1) return prev;
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  function addPlayer() {
    const name = newPlayer.trim();
    if (!name || players.includes(name)) return;
    setPlayers((p) => [...p, name]);
    setNewPlayer("");
  }

  function removePlayer(i: number) {
    if (players.length <= 1) return;
    setPlayers((p) => p.filter((_, idx) => idx !== i));
  }

  function handleStartEdit(cat: Category, m: Mode) {
    setDraft(texts[cat][m]);
    setEditingCat(cat);
    setEditingMode(m);
  }

  function handleSaveText() {
    if (!editingCat) return;
    const updatedTexts = {
      ...texts,
      [editingCat]: { ...texts[editingCat], [editingMode]: draft },
    };
    saveTexts(updatedTexts);
    if (phase === "play" && selected.has(editingCat) && editingMode === mode) {
      drawMessage(selected, mode, updatedTexts);
    }
    setEditingCat(null);
  }

  const config = CATEGORIES[currentCat];
  const currentPlayer = players[currentPlayerIdx] ?? players[0];
  const playerColor = PLAYER_COLORS[currentPlayerIdx % PLAYER_COLORS.length];

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Espace perso</h1>
          <Link to="/" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← Accueil</Link>
        </div>

        {/* Players */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 16 }}>Joueurs</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {players.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: PLAYER_COLORS[i % PLAYER_COLORS.length],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                }}>
                  {p[0].toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 15 }}>{p}</span>
                {players.length > 1 && (
                  <button
                    onClick={() => removePlayer(i)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: "0 4px" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Ajouter un joueur…"
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
            />
            <button
              onClick={addPlayer}
              style={{ padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              +
            </button>
          </div>
        </div>

        {/* Mode */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 16 }}>Intensité</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setMode("soft")}
              style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "2px solid",
                borderColor: mode === "soft" ? "#10b981" : "#e5e7eb",
                background: mode === "soft" ? "#ecfdf5" : "#fff",
                color: mode === "soft" ? "#065f46" : "#6b7280",
                cursor: "pointer", fontWeight: mode === "soft" ? 700 : 400, fontSize: 15,
              }}
            >
              🌸 Soft
              <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4 }}>Flirt & amusant</div>
            </button>
            <button
              onClick={() => setMode("hard")}
              style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "2px solid",
                borderColor: mode === "hard" ? "#ef4444" : "#e5e7eb",
                background: mode === "hard" ? "#fef2f2" : "#fff",
                color: mode === "hard" ? "#991b1b" : "#6b7280",
                cursor: "pointer", fontWeight: mode === "hard" ? 700 : 400, fontSize: 15,
              }}
            >
              🔥 Hard
              <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4 }}>Osé & explicite</div>
            </button>
          </div>
        </div>

        {/* Categories */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 16 }}>Catégories</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
              const c = CATEGORIES[cat];
              const isActive = selected.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "2px solid",
                    borderColor: isActive ? c.color : "#e5e7eb",
                    background: isActive ? c.color : "#fff",
                    color: isActive ? "#fff" : "#374151",
                    fontSize: 14, fontWeight: isActive ? 700 : 400, cursor: "pointer",
                  }}
                >
                  {c.emoji} {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Customize texts */}
        <details style={{ marginBottom: 24 }}>
          <summary style={{ fontSize: 13, color: "#6b7280", cursor: "pointer", padding: "8px 0" }}>
            Personnaliser les textes
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {(Object.keys(CATEGORIES) as Category[]).map((cat) => {
              const c = CATEGORIES[cat];
              const isEditing = editingCat === cat;
              return (
                <div key={cat} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fafafa" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: c.color }}>{c.emoji} {c.label}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => isEditing && editingMode === "soft" ? setEditingCat(null) : handleStartEdit(cat, "soft")}
                        style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: isEditing && editingMode === "soft" ? "#ecfdf5" : "#fff", color: "#374151", cursor: "pointer" }}
                      >
                        🌸 Soft
                      </button>
                      <button
                        onClick={() => isEditing && editingMode === "hard" ? setEditingCat(null) : handleStartEdit(cat, "hard")}
                        style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: isEditing && editingMode === "hard" ? "#fef2f2" : "#fff", color: "#374151", cursor: "pointer" }}
                      >
                        🔥 Hard
                      </button>
                    </div>
                  </div>
                  {isEditing && (
                    <div style={{ padding: 14, borderTop: "1px solid #e5e7eb" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>
                        Phrases séparées par <code>.</code> <code>?</code> <code>!</code>
                      </p>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        style={{ width: "100%", minHeight: 120, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                        <button onClick={() => setEditingCat(null)} style={{ padding: "6px 16px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13 }}>Annuler</button>
                        <button onClick={handleSaveText} style={{ padding: "6px 16px", background: c.color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Enregistrer</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>

        <button
          onClick={handleStart}
          disabled={players.length === 0 || selected.size === 0}
          style={{
            width: "100%", padding: "14px", background: "#4f46e5", color: "#fff",
            border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700,
            cursor: "pointer", opacity: players.length === 0 || selected.size === 0 ? 0.5 : 1,
          }}
        >
          Démarrer la partie →
        </button>
      </div>
    );
  }

  // ── PLAY SCREEN ───────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      {/* Navbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <button
          onClick={() => setPhase("setup")}
          style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          ← Retour
        </button>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20,
          background: mode === "soft" ? "#ecfdf5" : "#fef2f2",
          color: mode === "soft" ? "#065f46" : "#991b1b",
        }}>
          {mode === "soft" ? "🌸 Soft" : "🔥 Hard"}
        </span>
        <Link to="/" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← Accueil</Link>
      </div>

      {/* Player turn */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "14px 18px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: playerColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 18,
        }}>
          {currentPlayer[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>C'est le tour de</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: playerColor }}>{currentPlayer}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {players.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i === currentPlayerIdx ? playerColor : "#e5e7eb",
            }} />
          ))}
        </div>
      </div>

      {/* Message card */}
      <div style={{
        background: config.gradient,
        borderRadius: 16, padding: "36px 28px", textAlign: "center", marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
          {config.emoji} {config.label}
        </div>
        <p style={{
          fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.5,
          margin: "0 0 28px", minHeight: 80,
        }}>
          « {message} »
        </p>
        <button
          onClick={handleNext}
          style={{
            padding: "12px 28px", background: "rgba(255,255,255,0.2)", color: "#fff",
            border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, fontSize: 15,
            cursor: "pointer", fontWeight: 700,
          }}
        >
          {players.length > 1
            ? `Suivant → ${players[(currentPlayerIdx + 1) % players.length]}`
            : "Nouveau message"}
        </button>
      </div>

      {/* Players queue */}
      {players.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {players.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                borderRadius: 20, border: "2px solid",
                borderColor: i === currentPlayerIdx ? PLAYER_COLORS[i % PLAYER_COLORS.length] : "#e5e7eb",
                background: i === currentPlayerIdx ? PLAYER_COLORS[i % PLAYER_COLORS.length] + "15" : "#fff",
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: PLAYER_COLORS[i % PLAYER_COLORS.length],
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 11,
              }}>
                {p[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: i === currentPlayerIdx ? 700 : 400, color: i === currentPlayerIdx ? PLAYER_COLORS[i % PLAYER_COLORS.length] : "#374151" }}>
                {p}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
