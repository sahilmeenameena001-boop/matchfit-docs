# Pillar 4 Engine — Small-Cluster Matches

Implementation of the two combinatorial optimization problems from the spec
([Pillar4_Mathematical_Optimization.md](Pillar4_Mathematical_Optimization.md)):

1. **§7.1 Substitution & Minutes Equity** — inside one squad of ~5, field 4 and
   rotate the sub so everyone's minutes stay in the **0.90–1.10 equity band**.
2. **§7.2 Match Scheduling** — round-robin for ~6 squads on ~2 pitches,
   minimizing rest inequality, repeat fixtures and blowout mismatches.

The engine is **pure, dependency-free TypeScript** in [`src/lib/pillar4/`](../src/lib/pillar4/),
so it runs identically in server routes and in the browser.

| File | What it holds |
|---|---|
| `types.ts` | Shared types for both problems |
| `rotation.ts` | `planRotation()` — §7.1 greedy solver |
| `scheduling.ts` | `scheduleMatches()` — §7.2 template + simulated annealing |

## Where it surfaces

- **Page:** [`/matches`](../src/app/(dashboard)/matches/page.tsx) — staff workspace,
  computes locally in the browser (no login / DB needed, like the local calendar).
- **API:** staff-gated compute routes (nothing is written to the DB):

  | Route | Purpose |
  |---|---|
  | `POST /api/pillar4/rotation` | Rotation plan for one squad |
  | `POST /api/pillar4/schedule` | Round-robin schedule across squads |

  Validation: [`src/lib/validation/pillar4.ts`](../src/lib/validation/pillar4.ts).
- **Session plans:** `POST /api/plans/generate` will call the engine to pre-fill
  `squads` / `match_schedule` once squad rosters live in the DB (TODO in route).

## §7.1 — `planRotation()`

Math → code mapping:

| Spec | Code |
|---|---|
| `x_{p,i}` decision variable | membership of `intervals[i].onPitch` |
| `H_p` historical minutes | `players[].historicalMinutes` |
| `T_i` interval duration | `intervals[i].minutes` (last interval absorbs remainder) |
| `F_p` fatigue flag | `players[].fatigued` |
| Constraint 1 — exactly 4 on pitch | bench exactly `n − onPitch` players per interval |
| Constraint 2 — no consecutive benching | players benched last interval are excluded from bench candidates unless fatigued |
| Objective `min Σ (E(p) − 1)²` | reported as `variance`; the greedy always benches the highest-loaded eligible player |

Greedy heuristic per interval (spec §7.1): compute every player's projected
total (history + session so far), drop yesterday's benched from the candidate
pool (unless `fatigued`), bench the highest total. Ties break toward fewer
benches, then squad order — so the plan is deterministic and cycles cleanly.

```ts
import { planRotation } from "@/lib/pillar4";

const plan = planRotation({
  players: [
    { name: "Aarav" }, { name: "Vihaan" }, { name: "Ishaan", historicalMinutes: 30 },
    { name: "Reyansh" }, { name: "Kabir", fatigued: true },
  ],
  matchMinutes: 15, intervalMinutes: 3, onPitch: 4, // defaults shown
});
// plan.intervals — who is ON / SUB each interval
// plan.players   — session, total, equity E(p), withinBand
// plan.warnings  — e.g. carried-over minutes too skewed to fix in one match
```

Notes:
- Historical imbalance may be impossible to fix in a single match — the plan
  still minimizes it and the breach is reported in `warnings`, matching the
  band's intent as a *target*, not a hard guarantee.
- Works for any squad size ≥ `onPitch` (5v4 rotation is just the default).

## §7.2 — `scheduleMatches()`

Hard constraints hold **by construction** (each round is a permutation of the
squads: the first `2 × pitches` slots pair off, the rest sit out), so annealing
swaps can never produce a squad playing twice in a round or overbook a pitch.

Soft costs (spec weights, all tunable via `weights`):

| Penalty | Default | Counted when |
|---|---|---|
| `rest` (W_rest) | 10 | a squad plays a 3rd+ consecutive round |
| `wait` (W_wait) | 6 | a squad rests a 2nd+ consecutive round |
| `repeat` (W_repeat) | 8 | a pairing meets again |
| `mismatch` (W_mismatch) | 4 | per match, `|Δ rating|` normalized by the squad-rating spread |

Two solvers, per the spec:

- **`template`** (MVP): deterministic greedy fill — pick the pairing with the
  lexicographically least *(times met, games played, played-last-round, rating gap)*,
  i.e. fresh, rested, evenly-loaded, competitive fixtures first.
- **`annealed`** (default): the template polished by simulated annealing —
  swap two squads inside a random round; keep improvements, accept worse moves
  with probability `e^(−Δ/T)` while the temperature is high. Seeded PRNG
  (mulberry32, default `seed: 42`) → reproducible schedules; 2000 iterations
  run in a few milliseconds.

```ts
import { scheduleMatches } from "@/lib/pillar4";

const schedule = scheduleMatches({
  squads: [
    { name: "Squad A", rating: 1520 }, { name: "Squad B", rating: 1480 },
    { name: "Squad C", rating: 1450 }, { name: "Squad D", rating: 1410 },
    { name: "Squad E", rating: 1370 }, { name: "Squad F", rating: 1330 },
  ],
  rounds: 6, pitches: 2, method: "annealed", // defaults shown
});
// schedule.rounds       — per round: pitch fixtures + resting squads
// schedule.cost         — { rest, wait, repeat, mismatch, total }
// schedule.templateCost — greedy cost before annealing (shows the SA gain)
// schedule.squads       — games / rests / opponents per squad
```

With the defaults (6 squads, 2 pitches, 6 rounds) every squad plays 4 and
rests 2, and the 12 scheduled fixtures fit inside the 15 unique pairings — so a
zero-repeat, evenly-rested schedule exists and the solver finds it.

## API examples

```bash
curl -X POST http://localhost:3000/api/pillar4/rotation \
  -H "Content-Type: application/json" \
  -d '{"players":[{"name":"A"},{"name":"B"},{"name":"C"},{"name":"D"},{"name":"E"}]}'
```

```bash
curl -X POST http://localhost:3000/api/pillar4/schedule \
  -H "Content-Type: application/json" \
  -d '{"squads":[{"name":"A","rating":1500},{"name":"B","rating":1450},{"name":"C","rating":1400},{"name":"D","rating":1350},{"name":"E","rating":1300},{"name":"F","rating":1250}]}'
```

Both routes follow the standard envelope (`{ success, data | error }`) and
require a logged-in staff member, like the other write/compute routes.
