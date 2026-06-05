// Internal helpers that mutate a *clone* of the game state. `reduce` deep-clones
// before calling these, so the engine stays pure from the outside.

import { card } from "./content";
import { shuffle } from "./rng";
import type { Effect, GameState, PlayerState, ResourceBag } from "./types";

export function clone(state: GameState): GameState {
  return structuredClone(state);
}

export function addResources(bag: ResourceBag, delta: Partial<ResourceBag>): void {
  bag.firestone += delta.firestone ?? 0;
  bag.food += delta.food ?? 0;
  bag.eggs += delta.eggs ?? 0;
  bag.marks += delta.marks ?? 0;
}

/** Draw `n` cards into the player's hand, reshuffling the discard when the deck runs dry. */
export function draw(state: GameState, playerIndex: number, n: number): void {
  const p = state.players[playerIndex];
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) return; // nothing left to draw
      const sh = shuffle(p.discard, state.rngState);
      p.deck = sh.items;
      state.rngState = sh.state;
      p.discard = [];
    }
    const id = p.deck.pop();
    if (id) p.hand.push(id);
  }
}

/**
 * Apply an Effect to a player (mutating). Handles resources, renown, fight pool,
 * Red Star progress, and card draws (draws may chain into more reveals upstream).
 */
export function applyEffect(state: GameState, playerIndex: number, effect: Effect): void {
  const p = state.players[playerIndex];
  if (effect.resources) addResources(p.resources, effect.resources);
  if (effect.vp) p.vp += effect.vp;
  if (effect.fight) p.fightPool += effect.fight;
  if (effect.redStar) p.redStar += effect.redStar;
  if (effect.draw) draw(state, playerIndex, effect.draw);
}

/** Renown printed across every card a player owns (used at scoring). */
export function ownedRenown(p: PlayerState): number {
  const piles = [p.deck, p.hand, p.discard, p.inPlay, p.revealed];
  let total = 0;
  for (const pile of piles) {
    for (const id of pile) total += card(id).renown ?? 0;
  }
  return total;
}

/**
 * Index of the next player who still has actions this phase (`passed === false`),
 * scanning clockwise from the active player. Returns -1 when everyone is done.
 */
export function nextActive(state: GameState): number {
  const n = state.players.length;
  for (let k = 1; k <= n; k++) {
    const idx = (state.activePlayer + k) % n;
    if (!state.players[idx].passed) return idx;
  }
  return -1;
}

/** Reset every player's per-phase `passed` flag (used at phase boundaries). */
export function resetPassed(state: GameState): void {
  for (const p of state.players) p.passed = false;
}
