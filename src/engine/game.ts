// DROP engine — game creation, the action reducer, and endgame resolution.
// Pure: `reduce(state, action)` returns a new state without mutating the input.

import {
  FORECAST_DECK,
  MARKET_ROW_SIZE,
  MARKET_SUPPLY,
  SPACES,
  STARTER_DECK,
  ZONES,
  card,
  space,
} from "./content";
import { shuffle, weightedPick } from "./rng";
import {
  applyEffect,
  clone,
  draw,
  nextActive,
  ownedRenown,
  resetPassed,
} from "./helpers";
import { DRAGON_FIGHT } from "./types";
import type {
  Action,
  DragonColor,
  GameState,
  Outcome,
  PlayerScore,
  PlayerState,
} from "./types";

export const HAND_SIZE = 5;
export const DEFAULT_MAX_ROUNDS = 6;
export const RED_STAR_VP = 2;
/** Held zones reward defenders: 1 VP per this many points of committed defense. */
export const VALOR_DIVISOR = 3;

const STARTING_DRAGONS: Record<DragonColor, number> = {
  gold: 0,
  bronze: 1,
  brown: 1,
  blue: 1,
  green: 2,
};

export interface NewGameOptions {
  playerNames: string[];
  seed?: number;
  maxRounds?: number;
}

function makeStarterDeck(): string[] {
  const ids: string[] = [];
  for (const { id, count } of STARTER_DECK) {
    for (let i = 0; i < count; i++) ids.push(id);
  }
  return ids;
}

function makeMarketSupply(): string[] {
  const ids: string[] = [];
  for (const { id, count } of MARKET_SUPPLY) {
    for (let i = 0; i < count; i++) ids.push(id);
  }
  return ids;
}

/** Create a fresh game and open Round 1 (forecast revealed, hands dealt). */
export function createGame(opts: NewGameOptions): GameState {
  const numPlayers = opts.playerNames.length;
  if (numPlayers < 1 || numPlayers > 4) {
    throw new Error("DROP supports 1–4 players (v0.1).");
  }
  let rngState = (opts.seed ?? 0x1234abcd) >>> 0;

  const players: PlayerState[] = opts.playerNames.map((name, i) => {
    const sh = shuffle(makeStarterDeck(), rngState);
    rngState = sh.state;
    return {
      id: `p${i}`,
      name,
      deck: sh.items,
      hand: [],
      discard: [],
      inPlay: [],
      revealed: [],
      dragons: { ...STARTING_DRAGONS },
      placedThisRound: [],
      resources: { firestone: 0, food: 0, eggs: 0, marks: 2 },
      allegiances: [],
      vp: 0,
      redStar: 0,
      fightPool: 0,
      passed: false,
    };
  });

  const zones = Object.fromEntries(
    ZONES.map((z) => [z.id, { predicted: 0, defense: 0, contrib: new Array(numPlayers).fill(0) }]),
  );
  const board = Object.fromEntries(SPACES.map((s) => [s.id, { occupants: [] }]));

  const supplyShuffle = shuffle(makeMarketSupply(), rngState);
  rngState = supplyShuffle.state;
  const marketSupply = supplyShuffle.items;
  const market: string[] = [];
  for (let i = 0; i < MARKET_ROW_SIZE && marketSupply.length > 0; i++) {
    market.push(marketSupply.pop()!);
  }

  const forecastShuffle = shuffle(FORECAST_DECK.map((f) => f.id), rngState);
  rngState = forecastShuffle.state;
  const forecastDeck = forecastShuffle.items.map((id) => FORECAST_DECK.find((f) => f.id === id)!);

  const state: GameState = {
    round: 0,
    maxRounds: opts.maxRounds ?? DEFAULT_MAX_ROUNDS,
    phase: "flights",
    activePlayer: 0,
    players,
    zones,
    board,
    market,
    marketSupply,
    forecastDeck,
    rngState,
    log: [`Game created with ${numPlayers} weyrleader(s).`],
  };

  beginRound(state);
  return state;
}

/** Open a new round: reveal a forecast, deal hands, reset per-round state. */
function beginRound(state: GameState): void {
  state.round += 1;
  state.phase = "flights";
  state.activePlayer = 0;

  // Forecast.
  const forecast = state.forecastDeck.pop();
  if (forecast) {
    const parts: string[] = [];
    for (const [zoneId, amount] of Object.entries(forecast.thread)) {
      const z = state.zones[zoneId];
      if (z) {
        z.predicted += amount;
        parts.push(`${zoneId} +${amount}`);
      }
    }
    state.log.push(`Round ${state.round} forecast: Thread over ${parts.join(", ")}.`);
  } else {
    state.log.push(`Round ${state.round}: no forecast remaining.`);
  }

  // Reset board occupancy and per-round player state, then deal.
  for (const s of Object.values(state.board)) s.occupants = [];
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    p.passed = false;
    p.placedThisRound = [];
    p.fightPool = 0;
    p.inPlay = [];
    p.revealed = [];
    draw(state, i, HAND_SIZE);
  }
}

export function reduce(state: GameState, action: Action): GameState {
  const s = clone(state);
  switch (action.type) {
    case "PLACE":
      doPlace(s, action.spaceId, action.cardId, action.color);
      break;
    case "PASS":
      doPass(s);
      break;
    case "COMMIT":
      doCommit(s, action.zoneId, action.firestone, action.fight);
      break;
    case "DONE_COMMIT":
      doDonePhase(s, "acquire");
      break;
    case "ACQUIRE":
      doAcquire(s, action.cardId);
      break;
    case "DONE_ACQUIRE":
      doDonePhase(s, "cleanup");
      break;
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${JSON.stringify(_exhaustive)}`);
    }
  }
  return s;
}

function requirePhase(s: GameState, phase: GameState["phase"]): void {
  if (s.phase !== phase) throw new Error(`Action not allowed in phase "${s.phase}" (needs "${phase}").`);
}

function doPlace(s: GameState, spaceId: string, cardId: string, color: DragonColor): void {
  requirePhase(s, "flights");
  const p = s.players[s.activePlayer];
  if (p.passed) throw new Error("You have already passed this round.");

  const def = space(spaceId);
  const occ = s.board[spaceId];
  if (occ.occupants.length >= def.slots) throw new Error(`${def.name} is full.`);

  const handIdx = p.hand.indexOf(cardId);
  if (handIdx === -1) throw new Error(`Card ${cardId} not in hand.`);
  const cardDef = card(cardId);
  if (!cardDef.access.includes(def.tag)) {
    throw new Error(`${cardDef.name} cannot access a ${def.tag} space.`);
  }
  if ((p.dragons[color] ?? 0) <= 0) throw new Error(`No ${color} dragon available.`);

  // Spend the dragon and the card.
  p.dragons[color] -= 1;
  p.placedThisRound.push(color);
  p.hand.splice(handIdx, 1);
  p.inPlay.push(cardId);
  occ.occupants.push({ player: s.activePlayer, color });

  // Resolve rewards.
  applyEffect(s, s.activePlayer, def.reward);
  if (cardDef.onPlace) applyEffect(s, s.activePlayer, cardDef.onPlace);
  if (def.allegiance && def.zoneId) {
    p.allegiances.push({ spaceId, zoneId: def.zoneId, vp: def.allegiance });
  }
  s.log.push(`${p.name} sent a ${color} dragon to ${def.name}.`);

  advanceFlights(s);
}

function doPass(s: GameState): void {
  requirePhase(s, "flights");
  const p = s.players[s.activePlayer];
  p.passed = true;
  s.log.push(`${p.name} stands down for the round.`);
  advanceFlights(s);
}

function advanceFlights(s: GameState): void {
  const next = nextActive(s);
  if (next === -1) {
    revealAll(s);
    s.phase = "commit";
    resetPassed(s);
    s.activePlayer = 0;
    s.log.push("All wings have flown. Stand against Thread.");
  } else {
    s.activePlayer = next;
  }
}

/** Reveal every player's remaining hand, applying reveal effects (draws chain). */
function revealAll(s: GameState): void {
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    const queue = [...p.hand];
    p.hand = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      p.revealed.push(id);
      const def = card(id);
      if (def.reveal) {
        const before = p.hand.length;
        applyEffect(s, i, def.reveal); // may draw into hand
        // Fold any freshly drawn cards into the reveal queue.
        if (p.hand.length > before) {
          queue.push(...p.hand.splice(before));
        }
      }
    }
  }
}

function doCommit(s: GameState, zoneId: string, firestone: number, fight: number): void {
  requirePhase(s, "commit");
  const p = s.players[s.activePlayer];
  if (p.passed) throw new Error("You have finished committing this round.");
  if (firestone < 0 || fight < 0) throw new Error("Commit amounts must be non-negative.");
  if (firestone + fight <= 0) throw new Error("Commit something or end your commit.");
  const z = s.zones[zoneId];
  if (!z) throw new Error(`Unknown zone: ${zoneId}.`);
  if (p.resources.firestone < firestone) throw new Error("Not enough firestone.");
  if (p.fightPool < fight) throw new Error("Not enough fight strength revealed.");

  p.resources.firestone -= firestone;
  p.fightPool -= fight;
  const amount = firestone + fight;
  z.defense += amount;
  z.contrib[s.activePlayer] += amount;
  s.log.push(`${p.name} commits ${amount} defense to ${zoneId}.`);
}

function doAcquire(s: GameState, cardId: string): void {
  requirePhase(s, "acquire");
  const p = s.players[s.activePlayer];
  if (p.passed) throw new Error("You have finished acquiring this round.");
  const idx = s.market.indexOf(cardId);
  if (idx === -1) throw new Error(`${cardId} is not in the market.`);
  const def = card(cardId);
  const cost = def.cost ?? 0;
  if (p.resources.marks < cost) throw new Error("Not enough marks.");

  p.resources.marks -= cost;
  p.discard.push(cardId);
  s.market.splice(idx, 1);
  const refill = s.marketSupply.pop();
  if (refill) s.market.push(refill);
  s.log.push(`${p.name} acquires ${def.name} for ${cost} marks.`);
}

/** Mark the active player done with the current phase and advance / transition. */
function doDonePhase(s: GameState, nextPhaseOnComplete: "acquire" | "cleanup"): void {
  const p = s.players[s.activePlayer];
  p.passed = true;
  const next = nextActive(s);
  if (next !== -1) {
    s.activePlayer = next;
    return;
  }
  // Everyone is done with this phase.
  if (nextPhaseOnComplete === "acquire") {
    s.phase = "acquire";
    resetPassed(s);
    s.activePlayer = 0;
    s.log.push("Acquire cards from the market.");
  } else {
    endRound(s);
  }
}

function endRound(s: GameState): void {
  // Cleanup: discard everything in play, recall dragons.
  for (const p of s.players) {
    p.discard.push(...p.hand, ...p.inPlay, ...p.revealed);
    p.hand = [];
    p.inPlay = [];
    p.revealed = [];
    for (const color of p.placedThisRound) p.dragons[color] += 1;
    p.placedThisRound = [];
    p.fightPool = 0;
    p.passed = false;
  }
  for (const sp of Object.values(s.board)) sp.occupants = [];

  if (s.round >= s.maxRounds) {
    resolveThreadfall(s);
  } else {
    beginRound(s);
  }
}

/** Endgame: Thread falls on one zone (weighted by forecast), then score. */
function resolveThreadfall(s: GameState): void {
  const zoneIds = Object.keys(s.zones);
  const weights = zoneIds.map((z) => s.zones[z].predicted);
  const pick = weightedPick(weights, s.rngState);
  s.rngState = pick.state;
  const struckZone = zoneIds[pick.index];
  const z = s.zones[struckZone];
  const held = z.defense >= z.predicted;

  s.log.push(
    `Threadfall! The Red Star casts Thread over ${struckZone} ` +
      `(${z.predicted} Thread vs ${z.defense} defense) — ${held ? "HELD" : "BREAKTHROUGH"}.`,
  );

  if (!held) {
    for (const p of s.players) {
      const lost = p.allegiances.filter((a) => a.zoneId === struckZone);
      if (lost.length > 0) {
        s.log.push(`${p.name} loses ${lost.length} allegiance(s) in ${struckZone}.`);
      }
      p.allegiances = p.allegiances.filter((a) => a.zoneId !== struckZone);
    }
  }

  const scores: PlayerScore[] = s.players.map((p, i) => {
    const fromAllegiances = p.allegiances.reduce((a, b) => a + b.vp, 0);
    const fromRenown = p.vp + ownedRenown(p);
    const fromRedStar = p.redStar * RED_STAR_VP;
    const fromValor = held ? Math.floor(z.contrib[i] / VALOR_DIVISOR) : 0;
    return {
      player: i,
      fromAllegiances,
      fromRenown,
      fromRedStar,
      fromValor,
      total: fromAllegiances + fromRenown + fromRedStar + fromValor,
    };
  });

  // Winner: highest total, tie-break by Red Star progress then allegiance count.
  let winner = 0;
  for (let i = 1; i < scores.length; i++) {
    const a = scores[i];
    const b = scores[winner];
    if (
      a.total > b.total ||
      (a.total === b.total && s.players[i].redStar > s.players[winner].redStar) ||
      (a.total === b.total &&
        s.players[i].redStar === s.players[winner].redStar &&
        s.players[i].allegiances.length > s.players[winner].allegiances.length)
    ) {
      winner = i;
    }
  }

  const outcome: Outcome = {
    struckZone,
    threadInZone: z.predicted,
    defenseInZone: z.defense,
    held,
    scores,
    winner,
  };
  s.outcome = outcome;
  s.phase = "gameover";
  s.log.push(`${s.players[winner].name} leads the strike at the Red Star and wins!`);
}

// Re-export for consumers that want the fight table.
export { DRAGON_FIGHT };
