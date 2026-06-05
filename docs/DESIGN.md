# DROP — Dragonriders of Pern

A semi-cooperative **worker-placement / deck-builder** for 2–4 players.
Core loop modelled on *Dune: Imperium*. Theme: the dragonriders of Pern.

> This document is the **living rulebook**. It is the source of truth for the
> game engine in `src/engine/`. When rules and code disagree, that's a bug in
> one of them — fix it and note the change here. Versioned in Git so balance
> changes are diffable.

---

## 1. Fiction & fantasy

You are a **Weyrleader**. Thread — a mindless, devouring spore — falls from the
Red Star. Only dragons, flaming firestone in their bellies, can sear it from the
sky before it touches the ground and consumes everything it lands on.

You don't own land. The Holds (farmers, miners) and Craft Halls (smiths,
harpers, healers) do. They feed and supply the Weyrs in exchange for protection.
Win their **allegiance** by protecting them; lose it by letting Thread through.

No single Weyr can cover all of Pern. You must cooperate to stop Thread — but
only one Weyrleader earns the most renown, the strongest fighting Weyr, and the
honor of leading the strike at the **Red Star** itself. That player wins.

---

## 2. The semi-cooperative tension (the heart of the game)

- **Thread is forecast, not certain.** Over the game, the Starcraft Hall
  *predicts* Thread across several **Zones**. The predictions accumulate. But
  at game's end Thread actually falls on **exactly one Zone**, chosen
  semi-randomly, weighted by how heavily that Zone was forecast.
- **Defense is pooled.** A Zone's incoming Thread is met by the *combined*
  firestone + dragon strength every player has committed there. If the pool
  falls short, Thread breaks through and **everyone** with Holds/Craft Halls in
  that Zone loses those allegiances. No single Weyr can pool enough alone.
- **Allegiance is personal.** Points are scored individually. So you want the
  *other* players to spend their resources defending the Zones where *your*
  Holds sit, while you race ahead on points.

That push-pull — cover the table's exposure vs. sprint for personal renown — is
the game.

---

## 3. Components (state)

### Resources (per player)
| Resource    | Theme                                   | Used for |
|-------------|-----------------------------------------|----------|
| **Firestone** | Phosphine rock dragons chew to flame   | Defending Zones against Thread |
| **Food**      | Herdbeasts & crops from the Holds      | Feeding dragons/riders to unlock actions; upkeep |
| **Eggs**      | Clutches on the Hatching Ground        | Hatching new dragons (deck/worker growth) |
| **Marks**     | Pern's currency                        | Buying cards from the market |

### Dragons / riders (workers)
Workers come in colors, echoing Pern's dragon hierarchy:

| Color   | Theme            | Role (v0.1) |
|---------|------------------|-------------|
| Gold    | Queen, rare      | Strong; can access any space |
| Bronze  | Leadership       | Strong fighter |
| Brown   | Steady           | Workhorse |
| Blue    | Agile            | Workhorse |
| Green   | Numerous, nimble | Plentiful; weaker fighter |

In v0.1 a worker's **color** carries a fight-strength value and some spaces
require a minimum tier. Eggs hatch into new workers (default Green).

### The board
- **Holds & Craft Halls** — worker-placement spaces. Placing a dragon there
  yields resources / cards / allegiance. Each space has limited slots
  (placement contention). Each space sits in a **Zone**.
- **Card market** — a face-up row of acquirable cards (the "Imperium row").
- **Thread forecast track** — per-Zone accumulating predicted Thread.
- **Red Star track** — the endgame victory race.

### Cards (the deck-builder)
Each card has:
- **Access icons** — which board spaces it can send a dragon to.
- **On-place effect** — gained when you use the card to place a worker.
- **Reveal effect** — gained when revealed during the Reveal phase (resources +
  fight strength), if you didn't place it.
- **Cost / acquire effects** for cards in the market.

Players start with an identical 10-card **starter deck** (weak riders + basic
Hold/Hall access) and improve it over the game.

---

## 4. Round structure

A game is a fixed number of **Turns of Fall** (rounds). v0.1: 6 rounds.

Each round:

1. **Forecast.** Reveal the next Thread prediction: add predicted Thread to one
   or more Zones (semi-random). Players now see where Thread is likely to fall.
2. **Muster (draw).** Each player draws a hand from their deck (v0.1: 5 cards).
3. **Flights (agent turns).** Going clockwise, on your turn take ONE action:
   - **Send a dragon:** play a card whose access icon matches an open board
     space, place one of your dragons there, resolve the space reward + the
     card's on-place effect.
   - **Pass to Reveal:** stop placing for the round.
   Continue around the table until every player has passed.
4. **Reveal.** Each player reveals their remaining hand. Sum the **reveal
   effects** (resources gained) and the **fight strength** available to commit.
5. **Stand Against Thread (commit).** Players allocate firestone + revealed
   fight strength to Zones, building each Zone's defense pool.
6. **Acquire.** Spend Marks to buy cards from the market into your discard.
7. **Cleanup.** Discard hand & play area; recall dragons; refill the market.

After the final round: **Threadfall resolution** (§5), then scoring (§6).

---

## 5. Threadfall resolution (endgame)

1. **The Star falls.** Choose the struck Zone: weighted-random across Zones by
   accumulated predicted Thread. (Semi-random: heavily-forecast Zones are
   likelier but not certain — the forecast can be wrong.)
2. **Resolve the strike.** Compare the struck Zone's total **predicted Thread**
   to the combined **defense pool** committed there by all players.
   - **Held:** pool ≥ Thread → every Hold/Craft Hall in the Zone survives.
     Players keep those allegiances; defenders earn a valor bonus.
   - **Breakthrough:** pool < Thread → Thread scours the Zone. Every player
     loses the allegiance VP of their Holds/Craft Halls in that Zone.
3. Unstruck Zones are never tested — defense committed there is "wasted"
   (the cost of insurance).

---

## 6. Scoring & victory

Victory Points come from:
- **Allegiances** held at game end (Holds & Craft Halls protected).
- **Renown** printed on acquired cards / earned from spaces.
- **Red Star track** progress — the renown of leading the strike at the Red
  Star. Reaching the top of the track is a large VP swing (and a tie-breaker).

Highest VP wins. Tie-break: furthest on the Red Star track, then most allegiances.

---

## 7. v0.1 scope vs. roadmap

**Implemented in the engine (v0.1):**
- Full state model & immutable reducer.
- Starter decks, draw/hand/discard/reshuffle.
- Worker placement on a small set of Holds/Craft Halls with contention.
- Four resources + colored dragons.
- Thread forecast across Zones; pooled defense commit; weighted-random
  endgame resolution with breakthrough/held outcomes.
- A small card market with acquire.
- Round flow for a fixed number of rounds, then scoring.

**Roadmap (documented, not yet built):**
- Richer card pool & keyword effects engine.
- Egg → hatch → new dragon worker loop with color choice.
- Per-zone Hold/Hall ownership board & visual map.
- Red Star track as an interactive race with milestone rewards.
- "Intrigue"-style instant cards.
- AI opponents; networked multiplayer.
- Export to physical: print-and-play card/board generation from engine data.

---

## 8. Glossary (Pern → mechanics)

- **Weyr / Weyrleader** — a player.
- **Hold / Craft Hall** — a worker-placement space granting allegiance.
- **Thread** — the cooperative threat resolved at game end.
- **Firestone** — the anti-Thread resource.
- **Impression / Hatching** — gaining new dragon workers from eggs.
- **Red Star** — the victory race track.
