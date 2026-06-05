// DROP game engine — core type model.
// See docs/DESIGN.md for the rules these types encode.

export type DragonColor = "gold" | "bronze" | "brown" | "blue" | "green";

/** Fight strength contributed by one dragon of each color (used at the Threadfall commit). */
export const DRAGON_FIGHT: Record<DragonColor, number> = {
  gold: 4,
  bronze: 3,
  brown: 2,
  blue: 2,
  green: 1,
};

/** Spendable / countable resources held by a player. */
export interface ResourceBag {
  firestone: number;
  food: number;
  eggs: number;
  marks: number;
}

export const EMPTY_RESOURCES: ResourceBag = { firestone: 0, food: 0, eggs: 0, marks: 0 };

/** A bundle of gains. Applied additively. All fields optional. */
export interface Effect {
  resources?: Partial<ResourceBag>;
  /** Renown scored immediately. */
  vp?: number;
  /** Fight strength added to this round's commit pool. */
  fight?: number;
  /** Cards drawn. */
  draw?: number;
  /** Steps advanced on the Red Star track. */
  redStar?: number;
}

/** Which category of board space a card's dragon may be sent to. */
export type SpaceTag = "hold" | "hall" | "weyr";

/** Static definition of a deck card. */
export interface CardDef {
  id: string;
  name: string;
  /** Board-space tags this card can place a worker on. */
  access: SpaceTag[];
  /** Gained when the card is used to place a worker. */
  onPlace?: Effect;
  /** Gained when the card is revealed in the Reveal phase (instead of placed). */
  reveal?: Effect;
  /** Cost in Marks to acquire from the market (market cards only). */
  cost?: number;
  /** Renown printed on the card, scored at game end while in your deck. */
  renown?: number;
}

/** Static definition of a board space. */
export interface SpaceDef {
  id: string;
  name: string;
  tag: SpaceTag;
  /** Zone this space sits in. Undefined = a neutral Weyr space, never threatened by Thread. */
  zoneId?: string;
  /** Number of dragons that may occupy it per round. */
  slots: number;
  /** Reward gained on placement. */
  reward: Effect;
  /** If set, placing here grants an allegiance worth this many VP, lost if the zone breaks through. */
  allegiance?: number;
}

export interface ZoneDef {
  id: string;
  name: string;
}

/** A forecast card: predicted Thread added to zones when revealed. */
export interface ForecastCard {
  id: string;
  /** zoneId -> predicted Thread added. */
  thread: Record<string, number>;
}

// ---- Dynamic state ----

export interface Allegiance {
  spaceId: string;
  zoneId: string;
  vp: number;
}

export interface PlayerState {
  id: string;
  name: string;
  deck: string[]; // draw pile (card ids), top = end of array
  hand: string[];
  discard: string[];
  inPlay: string[]; // cards spent placing dragons this round
  revealed: string[]; // cards revealed this round
  dragons: Record<DragonColor, number>; // available dragons
  placedThisRound: DragonColor[]; // recalled at cleanup
  resources: ResourceBag;
  allegiances: Allegiance[];
  vp: number; // renown earned from spaces/cards during play
  redStar: number; // progress on the Red Star track
  fightPool: number; // fight strength available to commit this round
  passed: boolean; // passed to Reveal this round
}

export interface ZoneState {
  predicted: number; // accumulated forecast Thread
  defense: number; // committed defense pool (all players)
  contrib: number[]; // defense contributed, indexed by player (for valor scoring)
}

export interface SpaceState {
  occupants: Array<{ player: number; color: DragonColor }>;
}

export type Phase = "flights" | "commit" | "acquire" | "gameover";

export interface PlayerScore {
  player: number;
  total: number;
  fromAllegiances: number;
  fromRenown: number;
  fromRedStar: number;
  fromValor: number; // bonus for defending a zone that held
}

export interface Outcome {
  struckZone: string;
  threadInZone: number;
  defenseInZone: number;
  held: boolean;
  scores: PlayerScore[];
  winner: number; // player index
}

/** Actions the active player can take, dispatched through `reduce`. */
export type Action =
  | { type: "PLACE"; spaceId: string; cardId: string; color: DragonColor }
  | { type: "PASS" }
  | { type: "COMMIT"; zoneId: string; firestone: number; fight: number }
  | { type: "DONE_COMMIT" }
  | { type: "ACQUIRE"; cardId: string }
  | { type: "DONE_ACQUIRE" };

export interface GameState {
  round: number;
  maxRounds: number;
  phase: Phase;
  activePlayer: number;
  players: PlayerState[];
  zones: Record<string, ZoneState>;
  board: Record<string, SpaceState>;
  market: string[]; // face-up acquirable card ids
  marketSupply: string[]; // draw pile that refills the market
  forecastDeck: ForecastCard[]; // remaining forecasts (top = end)
  rngState: number; // deterministic PRNG state
  log: string[];
  outcome?: Outcome;
}
