# DROP — Dragonriders of Pern (board game prototype)

A semi-cooperative **worker-placement / deck-builder** for 2–4 players, themed on
the dragonriders of Pern. Core loop modelled on *Dune: Imperium*. Intended as a
physical board game; this repo is the digital prototype used to iterate on the
rules.

> 📜 The rules live in [`docs/DESIGN.md`](docs/DESIGN.md) — the living rulebook.
> The game **engine** (`src/engine/`) is a faithful, testable encoding of it.

## The pitch

You are a Weyrleader. Thread falls from the Red Star and devours everything it
touches. Win the **allegiance** of Holds and Craft Halls by protecting them —
but Thread is only *forecast* across several zones and strikes just one at game's
end, and no single Weyr can defend a zone alone. Cooperate to stop Thread while
racing your rivals for renown and the honor of striking at the Red Star.

See the design doc for the full loop, resources (firestone, food, eggs, marks),
colored dragons, and scoring.

## Architecture

The project deliberately separates **rules from presentation**:

- **`src/engine/`** — a pure, deterministic, fully-unit-tested TypeScript game
  engine. No UI, no I/O. `reduce(state, action)` returns a new state. This *is*
  the rulebook as code: seedable RNG makes games reproducible, and all balance
  numbers live in `content.ts` so changes are diffable in Git.
- **`src/ui/`** — a throwaway React view. Hotseat / pass-and-play. It only reads
  engine state and dispatches actions; it holds no rules.

This split means the engine can later drive AI opponents, networked play, or a
print-and-play generator for the physical game — without rewriting the rules.

## Develop

```bash
npm install
npm run dev        # play it locally (Vite dev server)
npm test           # run the engine test suite
npm run typecheck  # strict TypeScript check
npm run build      # production build to dist/
```

Requires Node 20+.

## Status

**v0.1** — a complete, playable vertical slice of the full loop. Roadmap and
scope are tracked at the bottom of [`docs/DESIGN.md`](docs/DESIGN.md).

## License

MIT.
