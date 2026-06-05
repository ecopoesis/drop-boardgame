import { describe, expect, it } from "vitest";
import { createGame, reduce } from "./game";
import { HAND_SIZE } from "./game";
import type { Action, GameState } from "./types";

function newGame(seed = 1): GameState {
  return createGame({ playerNames: ["Lessa", "F'lar"], seed });
}

describe("setup", () => {
  it("deals a hand and a full deck to each player", () => {
    const g = newGame();
    expect(g.players).toHaveLength(2);
    for (const p of g.players) {
      expect(p.hand).toHaveLength(HAND_SIZE);
      // 10-card starter, 5 in hand, 5 left in deck.
      expect(p.deck).toHaveLength(10 - HAND_SIZE);
      expect(p.resources.marks).toBe(2);
    }
  });

  it("reveals a forecast that adds Thread to at least one zone", () => {
    const g = newGame();
    const totalThread = Object.values(g.zones).reduce((a, z) => a + z.predicted, 0);
    expect(totalThread).toBeGreaterThan(0);
    expect(g.round).toBe(1);
    expect(g.phase).toBe("flights");
  });

  it("fills the market row", () => {
    const g = newGame();
    expect(g.market.length).toBeGreaterThan(0);
    expect(g.market.length).toBeLessThanOrEqual(5);
  });

  it("rejects out-of-range player counts", () => {
    expect(() => createGame({ playerNames: [] })).toThrow();
    expect(() => createGame({ playerNames: ["a", "b", "c", "d", "e"] })).toThrow();
  });
});

describe("placement", () => {
  it("spends a dragon and a card, and grants the space reward", () => {
    const g = newGame();
    const p = g.players[0];
    const cardId = p.hand[0];
    const before = { ...p.resources };
    const next = reduce(g, { type: "PLACE", spaceId: "pastures", cardId, color: "green" });
    const np = next.players[0];
    expect(np.resources.food).toBe(before.food + 2); // pastures => food +2
    expect(np.dragons.green).toBe(p.dragons.green - 1);
    expect(np.hand).toHaveLength(p.hand.length - 1);
    expect(next.board.pastures.occupants).toHaveLength(1);
    // Turn passes to the other player.
    expect(next.activePlayer).toBe(1);
  });

  it("grants an allegiance when placing on a Hold", () => {
    const g = newGame();
    const cardId = g.players[0].hand[0];
    const next = reduce(g, { type: "PLACE", spaceId: "fort_hold", cardId, color: "bronze" });
    expect(next.players[0].allegiances).toEqual([
      { spaceId: "fort_hold", zoneId: "fort", vp: 3 },
    ]);
  });

  it("enforces single-slot contention", () => {
    let g = newGame();
    g = reduce(g, { type: "PLACE", spaceId: "fort_hold", cardId: g.players[0].hand[0], color: "green" });
    // Now player 1 tries the same single-slot space.
    expect(() =>
      reduce(g, { type: "PLACE", spaceId: "fort_hold", cardId: g.players[1].hand[0], color: "green" }),
    ).toThrow(/full/);
  });

  it("does not allow placing in the wrong phase", () => {
    const g = newGame();
    const bad = { ...g, phase: "commit" as const };
    expect(() => reduce(bad, { type: "PLACE", spaceId: "pastures", cardId: g.players[0].hand[0], color: "green" })).toThrow();
  });
});

/** Drive a whole game where everyone immediately passes each round. */
function playPassiveGame(seed: number): GameState {
  let g = createGame({ playerNames: ["A", "B"], seed });
  let guard = 0;
  while (g.phase !== "gameover") {
    guard++;
    if (guard > 1000) throw new Error("game did not terminate");
    const action: Action =
      g.phase === "flights"
        ? { type: "PASS" }
        : g.phase === "commit"
          ? { type: "DONE_COMMIT" }
          : { type: "DONE_ACQUIRE" };
    g = reduce(g, action);
  }
  return g;
}

describe("full game flow", () => {
  it("runs to a Threadfall outcome and declares a winner", () => {
    const g = playPassiveGame(42);
    expect(g.phase).toBe("gameover");
    expect(g.outcome).toBeDefined();
    const o = g.outcome!;
    expect(Object.keys(g.zones)).toContain(o.struckZone);
    expect(o.winner).toBeGreaterThanOrEqual(0);
    expect(o.winner).toBeLessThan(2);
    expect(o.scores).toHaveLength(2);
    // Held iff defense >= thread.
    expect(o.held).toBe(o.defenseInZone >= o.threadInZone);
  });

  it("is deterministic for a fixed seed", () => {
    const a = playPassiveGame(7);
    const b = playPassiveGame(7);
    expect(a.outcome).toEqual(b.outcome);
  });

  it("committing defense can hold a zone", () => {
    // Build firestone, then dump it all into the forecast zone to force a HELD result.
    let g = createGame({ playerNames: ["A", "B"], seed: 3, maxRounds: 1 });
    // Mine firestone with both players, then pass.
    g = reduce(g, { type: "PLACE", spaceId: "firestone_mine", cardId: g.players[0].hand[0], color: "green" });
    g = reduce(g, { type: "PLACE", spaceId: "firestone_mine", cardId: g.players[1].hand[0], color: "green" });
    g = reduce(g, { type: "PASS" });
    g = reduce(g, { type: "PASS" });
    expect(g.phase).toBe("commit");

    // Find the forecast zone and pour all firestone into it from both players.
    const zoneId = Object.keys(g.zones).find((z) => g.zones[z].predicted > 0)!;
    for (let i = 0; i < 2; i++) {
      const fs = g.players[g.activePlayer].resources.firestone;
      if (fs > 0) g = reduce(g, { type: "COMMIT", zoneId, firestone: fs, fight: 0 });
      g = reduce(g, { type: "DONE_COMMIT" });
    }
    g = reduce(g, { type: "DONE_ACQUIRE" });
    g = reduce(g, { type: "DONE_ACQUIRE" });
    expect(g.phase).toBe("gameover");
    // We committed defense to the only forecast zone; if it was struck it should hold.
    if (g.outcome!.struckZone === zoneId) {
      expect(g.outcome!.held).toBe(true);
    }
  });
});
