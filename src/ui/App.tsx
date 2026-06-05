import { useMemo, useState } from "react";
import {
  SPACES,
  ZONES,
  card,
  createGame,
  reduce,
  space,
  type Action,
  type DragonColor,
  type GameState,
} from "../engine";
import { describeEffect, describeResources, RESOURCE_ICON } from "./format";

const DRAGON_COLORS: DragonColor[] = ["gold", "bronze", "brown", "blue", "green"];
const DRAGON_GLYPH: Record<DragonColor, string> = {
  gold: "🟡",
  bronze: "🟤",
  brown: "🟫",
  blue: "🔵",
  green: "🟢",
};

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  function dispatch(action: Action) {
    if (!game) return;
    try {
      setGame(reduce(game, action));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!game) return <StartScreen onStart={setGame} />;

  return (
    <div className="app">
      <Header game={game} />
      {error && <div className="error" onClick={() => setError(null)}>⚠ {error} (click to dismiss)</div>}
      <div className="columns">
        <main className="board-col">
          {game.phase === "flights" && <FlightsPhase game={game} dispatch={dispatch} />}
          {game.phase === "commit" && <CommitPhase game={game} dispatch={dispatch} />}
          {game.phase === "acquire" && <AcquirePhase game={game} dispatch={dispatch} />}
          {game.phase === "gameover" && <GameOver game={game} onRestart={() => setGame(null)} />}
        </main>
        <aside className="side-col">
          <Players game={game} />
          <Zones game={game} />
          <Log game={game} />
        </aside>
      </div>
    </div>
  );
}

function StartScreen({ onStart }: { onStart: (g: GameState) => void }) {
  const [count, setCount] = useState(2);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const defaults = ["Lessa", "F'lar", "R'gul", "Mardra"];
  const names = defaults.slice(0, count);
  return (
    <div className="start">
      <h1>DROP</h1>
      <p className="tagline">Dragonriders of Pern — worker-placement deck-builder · prototype v0.1</p>
      <div className="start-controls">
        <label>
          Weyrleaders:&nbsp;
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Seed:&nbsp;
          <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
        </label>
        <button className="primary" onClick={() => onStart(createGame({ playerNames: names, seed }))}>
          Begin the Pass
        </button>
      </div>
      <p className="hint">Hotseat / pass-and-play. The active weyrleader takes their turn, then hands off.</p>
    </div>
  );
}

function Header({ game }: { game: GameState }) {
  const active = game.players[game.activePlayer];
  const phaseLabel: Record<GameState["phase"], string> = {
    flights: "Flights — send dragons",
    commit: "Stand Against Thread — commit defense",
    acquire: "Gather — acquire cards",
    gameover: "Threadfall resolved",
  };
  return (
    <header className="header">
      <div className="title">DROP</div>
      <div className="status">
        <span>Round {game.round}/{game.maxRounds}</span>
        <span className="phase">{phaseLabel[game.phase]}</span>
        {game.phase !== "gameover" && (
          <span className="active">Active: <strong>{active.name}</strong></span>
        )}
      </div>
    </header>
  );
}

function FlightsPhase({ game, dispatch }: { game: GameState; dispatch: (a: Action) => void }) {
  const p = game.players[game.activePlayer];
  const [selectedCard, setSelectedCard] = useState<{ id: string; idx: number } | null>(null);
  const [color, setColor] = useState<DragonColor | null>(null);

  const availableColors = DRAGON_COLORS.filter((c) => p.dragons[c] > 0);
  // Default a color if none chosen.
  const activeColor = color && p.dragons[color] > 0 ? color : (availableColors[0] ?? null);

  function canPlace(spaceId: string): boolean {
    if (!selectedCard || !activeColor) return false;
    const def = space(spaceId);
    const cardDef = card(selectedCard.id);
    return (
      cardDef.access.includes(def.tag) &&
      game.board[spaceId].occupants.length < def.slots &&
      p.dragons[activeColor] > 0
    );
  }

  function place(spaceId: string) {
    if (!selectedCard || !activeColor) return;
    dispatch({ type: "PLACE", spaceId, cardId: selectedCard.id, color: activeColor });
    setSelectedCard(null);
  }

  return (
    <>
      <Board game={game} canPlace={canPlace} onPlace={place} />
      <section className="panel">
        <h3>{p.name}'s hand</h3>
        <div className="hand">
          {p.hand.map((id, idx) => {
            const c = card(id);
            const sel = selectedCard?.idx === idx;
            return (
              <button
                key={idx}
                className={`card ${sel ? "selected" : ""}`}
                onClick={() => setSelectedCard(sel ? null : { id, idx })}
              >
                <div className="card-name">{c.name}</div>
                <div className="card-line">access: {c.access.join("/")}</div>
                <div className="card-line">reveal: {describeEffect(c.reveal)}</div>
                {c.onPlace && <div className="card-line">place: {describeEffect(c.onPlace)}</div>}
              </button>
            );
          })}
          {p.hand.length === 0 && <em>No cards left in hand.</em>}
        </div>
        <div className="dragon-row">
          <span>Dragon to send:</span>
          {availableColors.length === 0 && <em>no dragons available</em>}
          {availableColors.map((c) => (
            <button
              key={c}
              className={`dragon ${activeColor === c ? "selected" : ""}`}
              onClick={() => setColor(c)}
            >
              {DRAGON_GLYPH[c]} {c} ×{p.dragons[c]}
            </button>
          ))}
        </div>
        <div className="actions">
          <span className="hint">
            {selectedCard ? "Pick a dragon, then an open space." : "Select a card to send a dragon."}
          </span>
          <button className="ghost" onClick={() => dispatch({ type: "PASS" })}>
            Stand down (pass) →
          </button>
        </div>
      </section>
    </>
  );
}

function Board({
  game,
  canPlace,
  onPlace,
}: {
  game: GameState;
  canPlace?: (id: string) => boolean;
  onPlace?: (id: string) => void;
}) {
  return (
    <section className="panel">
      <h3>Pern</h3>
      <div className="board">
        {SPACES.map((s) => {
          const occ = game.board[s.id].occupants;
          const placeable = canPlace?.(s.id) ?? false;
          return (
            <button
              key={s.id}
              className={`space tag-${s.tag} ${placeable ? "placeable" : ""}`}
              disabled={!placeable}
              onClick={() => onPlace?.(s.id)}
            >
              <div className="space-name">{s.name}</div>
              <div className="space-meta">
                <span className="zone">{s.zoneId ? ZONES.find((z) => z.id === s.zoneId)!.name : "Weyr"}</span>
                {s.allegiance && <span className="alleg">⚑{s.allegiance}</span>}
              </div>
              <div className="space-reward">{describeEffect(s.reward)}</div>
              <div className="slots">
                {Array.from({ length: s.slots }).map((_, i) => (
                  <span key={i} className={`slot ${occ[i] ? "filled" : ""}`}>
                    {occ[i] ? DRAGON_GLYPH[occ[i].color] : "○"}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CommitPhase({ game, dispatch }: { game: GameState; dispatch: (a: Action) => void }) {
  const p = game.players[game.activePlayer];
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const [firestone, setFirestone] = useState(0);
  const [fight, setFight] = useState(0);

  return (
    <>
      <Board game={game} />
      <section className="panel">
        <h3>{p.name}: stand against Thread</h3>
        <p className="hint">
          You have {RESOURCE_ICON.firestone}{p.resources.firestone} firestone and ⚔️{p.fightPool} fight
          strength revealed. Pool defense into the zones you think Thread will strike — no single Weyr
          can cover it all.
        </p>
        <div className="commit-form">
          <label>
            Zone:&nbsp;
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — Thread {game.zones[z.id].predicted}, defense {game.zones[z.id].defense}
                </option>
              ))}
            </select>
          </label>
          <label>
            🔥&nbsp;
            <input type="number" min={0} max={p.resources.firestone} value={firestone}
              onChange={(e) => setFirestone(Math.max(0, Number(e.target.value)))} />
          </label>
          <label>
            ⚔️&nbsp;
            <input type="number" min={0} max={p.fightPool} value={fight}
              onChange={(e) => setFight(Math.max(0, Number(e.target.value)))} />
          </label>
          <button
            className="primary"
            disabled={firestone + fight <= 0}
            onClick={() => {
              dispatch({ type: "COMMIT", zoneId, firestone, fight });
              setFirestone(0);
              setFight(0);
            }}
          >
            Commit
          </button>
        </div>
        <div className="actions">
          <button className="ghost" onClick={() => dispatch({ type: "DONE_COMMIT" })}>
            Done committing →
          </button>
        </div>
      </section>
    </>
  );
}

function AcquirePhase({ game, dispatch }: { game: GameState; dispatch: (a: Action) => void }) {
  const p = game.players[game.activePlayer];
  return (
    <section className="panel">
      <h3>{p.name}: the Gather ({RESOURCE_ICON.marks}{p.resources.marks} marks)</h3>
      <div className="market">
        {game.market.map((id, idx) => {
          const c = card(id);
          const cost = c.cost ?? 0;
          const afford = p.resources.marks >= cost;
          return (
            <button key={idx} className={`card market-card ${afford ? "" : "disabled"}`} disabled={!afford}
              onClick={() => dispatch({ type: "ACQUIRE", cardId: id })}>
              <div className="card-name">{c.name} <span className="cost">🪙{cost}</span></div>
              {c.renown ? <div className="card-line">renown 🏆{c.renown}</div> : null}
              <div className="card-line">reveal: {describeEffect(c.reveal)}</div>
              {c.onPlace && <div className="card-line">place: {describeEffect(c.onPlace)}</div>}
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button className="ghost" onClick={() => dispatch({ type: "DONE_ACQUIRE" })}>
          Done acquiring →
        </button>
      </div>
    </section>
  );
}

function Players({ game }: { game: GameState }) {
  return (
    <section className="panel players">
      <h3>Weyrs</h3>
      {game.players.map((p, i) => (
        <div key={p.id} className={`player ${i === game.activePlayer && game.phase !== "gameover" ? "is-active" : ""}`}>
          <div className="player-name">{p.name} {p.passed && game.phase !== "gameover" ? "✓" : ""}</div>
          <div className="player-res">{describeResources(p.resources)}</div>
          <div className="player-line">
            🐉 {DRAGON_COLORS.filter((c) => p.dragons[c] > 0).map((c) => `${DRAGON_GLYPH[c]}${p.dragons[c]}`).join(" ") || "—"}
            &nbsp;·&nbsp;⚔️{p.fightPool} · ⭐{p.redStar} · ⚑{p.allegiances.length}
          </div>
        </div>
      ))}
    </section>
  );
}

function Zones({ game }: { game: GameState }) {
  return (
    <section className="panel">
      <h3>Thread forecast</h3>
      {ZONES.map((z) => {
        const zs = game.zones[z.id];
        const held = zs.defense >= zs.predicted;
        return (
          <div key={z.id} className="zone-row">
            <span className="zone-name">{z.name}</span>
            <span className="zone-bar">
              <span className="threat" style={{ width: `${Math.min(100, zs.predicted * 10)}%` }} />
              <span className="defense" style={{ width: `${Math.min(100, zs.defense * 10)}%` }} />
            </span>
            <span className={`zone-num ${held ? "safe" : "danger"}`}>
              🪡{zs.predicted} / 🛡{zs.defense}
            </span>
          </div>
        );
      })}
    </section>
  );
}

function Log({ game }: { game: GameState }) {
  const recent = useMemo(() => game.log.slice(-12).reverse(), [game.log]);
  return (
    <section className="panel log">
      <h3>Chronicle</h3>
      <ul>
        {recent.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function GameOver({ game, onRestart }: { game: GameState; onRestart: () => void }) {
  const o = game.outcome!;
  const ranked = [...o.scores].sort((a, b) => b.total - a.total);
  return (
    <section className="panel gameover">
      <h2>Threadfall over {ZONES.find((z) => z.id === o.struckZone)!.name}</h2>
      <p className={o.held ? "safe" : "danger"}>
        {o.threadInZone} Thread vs {o.defenseInZone} defense — <strong>{o.held ? "HELD" : "BREAKTHROUGH"}</strong>
      </p>
      <table className="scores">
        <thead>
          <tr><th>Weyr</th><th>Allegiance</th><th>Renown</th><th>Red Star</th><th>Valor</th><th>Total</th></tr>
        </thead>
        <tbody>
          {ranked.map((s) => (
            <tr key={s.player} className={s.player === o.winner ? "winner" : ""}>
              <td>{game.players[s.player].name}{s.player === o.winner ? " 👑" : ""}</td>
              <td>{s.fromAllegiances}</td>
              <td>{s.fromRenown}</td>
              <td>{s.fromRedStar}</td>
              <td>{s.fromValor}</td>
              <td><strong>{s.total}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="primary" onClick={onRestart}>New game</button>
    </section>
  );
}
