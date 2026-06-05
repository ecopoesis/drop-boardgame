// Deterministic, seedable PRNG (mulberry32). The whole engine is deterministic
// given a seed, so games are reproducible and tests are stable. The RNG state is
// carried in GameState.rngState and threaded through pure helpers below.

export interface Rng {
  state: number;
  value: number; // a float in [0, 1)
}

/** Advance the PRNG, returning the new state and a float in [0, 1). */
export function next(state: number): Rng {
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: t >>> 0, value };
}

/** Return an integer in [0, n). */
export function nextInt(state: number, n: number): { state: number; value: number } {
  const r = next(state);
  return { state: r.state, value: Math.floor(r.value * n) };
}

/** Fisher–Yates shuffle returning a new array and the advanced PRNG state. */
export function shuffle<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const arr = items.slice();
  let s = state;
  for (let i = arr.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1);
    s = r.state;
    const j = r.value;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { items: arr, state: s };
}

/**
 * Weighted pick: choose an index where probability is proportional to weights.
 * Falls back to a uniform pick if all weights are zero.
 */
export function weightedPick(weights: readonly number[], state: number): { index: number; state: number } {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    const r = nextInt(state, weights.length);
    return { index: r.value, state: r.state };
  }
  const r = next(state);
  let target = r.value * total;
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i];
    if (target < 0) return { index: i, state: r.state };
  }
  return { index: weights.length - 1, state: r.state };
}
