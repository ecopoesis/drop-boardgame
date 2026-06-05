// DROP content — the data tables that define the v0.1 game.
// Tuning these numbers is balance work; keep it diffable.

import type { CardDef, ForecastCard, SpaceDef, ZoneDef } from "./types";

// ---- Zones (regions of Pern that Thread is forecast across) ----
export const ZONES: ZoneDef[] = [
  { id: "fort", name: "Fort" },
  { id: "benden", name: "Benden" },
  { id: "telgar", name: "Telgar" },
  { id: "ista", name: "Ista" },
];

// ---- Board spaces ----
// Allegiance spaces sit in a zone (threatened by Thread) and have a single slot
// (worker-placement contention). Weyr spaces are neutral utility, more slots.
export const SPACES: SpaceDef[] = [
  // Allegiance: Holds & Craft Halls, one per zone.
  {
    id: "fort_hold",
    name: "Fort Hold",
    tag: "hold",
    zoneId: "fort",
    slots: 1,
    reward: { resources: { food: 1 } },
    allegiance: 3,
  },
  {
    id: "benden_hold",
    name: "Benden Hold",
    tag: "hold",
    zoneId: "benden",
    slots: 1,
    reward: { resources: { marks: 1 } },
    allegiance: 3,
  },
  {
    id: "telgar_smithcraft",
    name: "Telgar Smithcrafthall",
    tag: "hall",
    zoneId: "telgar",
    slots: 1,
    reward: { resources: { firestone: 1 } },
    allegiance: 3,
  },
  {
    id: "ista_hold",
    name: "Ista Hold",
    tag: "hold",
    zoneId: "ista",
    slots: 1,
    reward: { resources: { food: 1, marks: 1 } },
    allegiance: 4,
  },

  // Neutral Weyr / utility spaces.
  {
    id: "pastures",
    name: "Herdbeast Pastures",
    tag: "weyr",
    slots: 2,
    reward: { resources: { food: 2 } },
  },
  {
    id: "firestone_mine",
    name: "Firestone Mine",
    tag: "weyr",
    slots: 2,
    reward: { resources: { firestone: 2 } },
  },
  {
    id: "hatching_ground",
    name: "Hatching Ground",
    tag: "weyr",
    slots: 1,
    reward: { resources: { eggs: 1 } },
  },
  {
    id: "gather",
    name: "Gather Market",
    tag: "weyr",
    slots: 2,
    reward: { resources: { marks: 2 } },
  },
  {
    id: "harper_hall",
    name: "Harper Hall",
    tag: "hall",
    slots: 1,
    reward: { resources: { marks: 1 }, draw: 1 },
  },
  {
    id: "star_stones",
    name: "Star Stones",
    tag: "weyr",
    slots: 1,
    reward: { redStar: 1 },
  },
];

// ---- Cards ----

// Starter deck: 10 identical cards per player. Broad access (placement in v0.1 is
// gated by slots & dragons, not access); value is in the reveal.
export const STARTER_CARDS: CardDef[] = [
  { id: "weyrling", name: "Weyrling", access: ["weyr", "hold", "hall"], reveal: { resources: { food: 1 } } },
  { id: "holdbred_rider", name: "Holdbred Rider", access: ["weyr", "hold", "hall"], reveal: { resources: { marks: 1 } } },
  { id: "wingsecond", name: "Wingsecond", access: ["weyr", "hold", "hall"], reveal: { fight: 1 } },
  { id: "smiths_apprentice", name: "Smith's Apprentice", access: ["weyr", "hold", "hall"], reveal: { resources: { firestone: 1 } } },
];

/** The composition of one player's starting deck (card id -> count). Total 10. */
export const STARTER_DECK: Array<{ id: string; count: number }> = [
  { id: "weyrling", count: 4 },
  { id: "holdbred_rider", count: 3 },
  { id: "wingsecond", count: 2 },
  { id: "smiths_apprentice", count: 1 },
];

// Market cards: acquirable improvements. `cost` in Marks; `renown` scored at end.
export const MARKET_CARDS: CardDef[] = [
  { id: "brown_rider", name: "Brown Rider", access: ["weyr", "hold", "hall"], cost: 3, renown: 1, reveal: { fight: 2 } },
  { id: "bronze_rider", name: "Bronze Rider", access: ["weyr", "hold", "hall"], cost: 4, renown: 1, reveal: { fight: 3 } },
  { id: "queen_rider", name: "Queen Rider", access: ["weyr", "hold", "hall"], cost: 6, renown: 2, reveal: { fight: 4 } },
  { id: "firestone_wagon", name: "Firestone Wagon", access: ["weyr"], cost: 3, reveal: { resources: { firestone: 3 } } },
  { id: "beastholder", name: "Beastholder", access: ["weyr", "hold"], cost: 2, reveal: { resources: { food: 2, marks: 1 } } },
  { id: "masterharper", name: "Masterharper", access: ["hall", "weyr"], cost: 4, renown: 2, reveal: { draw: 1, resources: { marks: 1 } } },
  { id: "starsmith", name: "Starsmith", access: ["hall", "weyr"], cost: 5, renown: 1, onPlace: { redStar: 1 }, reveal: { fight: 1 } },
  { id: "threadscore_veteran", name: "Threadscore Veteran", access: ["weyr", "hold", "hall"], cost: 4, renown: 1, reveal: { fight: 2, resources: { firestone: 1 } } },
];

/** How many copies of each market card go into the supply. */
export const MARKET_SUPPLY: Array<{ id: string; count: number }> = MARKET_CARDS.map((c) => ({ id: c.id, count: 3 }));

export const MARKET_ROW_SIZE = 5;

// ---- Forecast deck ----
// Each round one forecast is revealed, adding predicted Thread to zones.
// Calibrated so that over 6 rounds the struck zone holds a meaningful threat.
export const FORECAST_DECK: ForecastCard[] = [
  { id: "f1", thread: { fort: 2, benden: 1 } },
  { id: "f2", thread: { telgar: 2, ista: 1 } },
  { id: "f3", thread: { benden: 3 } },
  { id: "f4", thread: { ista: 2, fort: 1 } },
  { id: "f5", thread: { telgar: 1, fort: 1, benden: 1 } },
  { id: "f6", thread: { ista: 3 } },
  { id: "f7", thread: { telgar: 3 } },
  { id: "f8", thread: { fort: 2, ista: 1 } },
];

// ---- Lookups ----
export const ALL_CARDS: Record<string, CardDef> = Object.fromEntries(
  [...STARTER_CARDS, ...MARKET_CARDS].map((c) => [c.id, c]),
);

export const SPACE_BY_ID: Record<string, SpaceDef> = Object.fromEntries(SPACES.map((s) => [s.id, s]));

export function card(id: string): CardDef {
  const c = ALL_CARDS[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function space(id: string): SpaceDef {
  const s = SPACE_BY_ID[id];
  if (!s) throw new Error(`Unknown space: ${id}`);
  return s;
}
