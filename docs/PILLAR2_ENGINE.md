# Pillar 2 Engine — Gamified Football Drills

Implementation of the logic spec ([Pillar2_Gamified_Drills.md](Pillar2_Gamified_Drills.md)):
challenge selection, engagement checks, adaptive scoring, anti-gaming rules and weighted XP.

The engine is **pure, dependency-free TypeScript** in [`src/lib/pillar2/`](../src/lib/pillar2/),
so it runs identically in server routes and in the browser (same pattern as the Pillar 4
engine, [PILLAR4_ENGINE.md](PILLAR4_ENGINE.md)).

| File | What it holds |
|---|---|
| `types.ts` | Shared types (tags, attempts, scores, XP) |
| `catalog.ts` | The §5.1 example challenges, fully tagged per §5.3 |
| `engagement.ts` | §5.4 — `checkEngagement()`: at least 3 mechanics per drill |
| `selection.ts` | §5.3 — `selectChallenges()`: the challenge-selection algorithm |
| `scoring.ts` | §5.5 multipliers, §5.6 anti-gaming, §5.2 squad totals, §5.7 XP |

## API (validation in [`src/lib/validation/pillar2.ts`](../src/lib/validation/pillar2.ts))

| Route | Access | Purpose |
|---|---|---|
| `GET /api/pillar2/challenges` | Public | Browse the tagged challenge library |
| `POST /api/pillar2/select` | Staff | Pick the best challenges for a session (§5.3) |
| `POST /api/pillar2/score` | Staff | Score a squad's run — anti-gaming + multipliers (§5.5/5.6) |
| `POST /api/pillar2/xp` | Staff | Weighted XP ranking (§5.7) |

All three POST routes are pure compute (nothing written), staff-gated like the app's
other write/compute routes, and reply in the standard `{ success, data | error }` envelope.

## §5.3 — `selectChallenges()`

```
Challenge Score = Relevance + Player Need + Novelty + Equipment Fit − Fatigue Risk
```

Every term is normalised to 0–1, then weighted (defaults: relevance 3, need 2.5,
novelty 2, equipment fit 1, fatigue risk 2 — all tunable per request):

| Term | How it's computed |
|---|---|
| Relevance | primary skill in the session focus → 1, secondary → 0.5. Once a primary skill is already covered this session, further games on it are damped ×0.6 for variety |
| Player Need | severity (0–1) of squad weaknesses over the challenge's skills — the spec's *"poor first-touch outcomes → first-touch games score higher"* |
| Novelty | intrinsic freshness × exposure freshness. A game played 1 session ago carries a full exposure load fading over 4 sessions; *played twice recently ⇒ ~zero freshness* — the spec's repeat penalty |
| Equipment Fit | fraction of required equipment available; by default a challenge missing equipment is excluded outright (`strictEquipment: false` to soften) |
| Fatigue Risk | intensity load (low 0.2 / medium 0.5 / high 0.9) scaled up as intense picks stack, so the greedy running order alternates hard and light games |

Hard filters before scoring: enough players in the squad, space fits, equipment present.
Selection is greedy and deterministic; each pick returns its full score breakdown, and
excluded challenges come back with their reasons.

```ts
import { selectChallenges } from "@/lib/pillar2";

const session = selectChallenges({
  sessionFocus: ["first_touch", "finishing"],
  playerNeeds: { first_touch: 0.8 },          // weak first touch last session
  recentChallenges: [
    { challengeId: "target-finishing", sessionsAgo: 1 },
    { challengeId: "target-finishing", sessionsAgo: 2 },  // played twice recently
  ],
  availableEquipment: ["cones", "balls", "bibs"],
  availableSpace: "medium",
  squadSize: 5,
  count: 3,
});
// session.selected[i] -> { challenge, order, score: {relevance, need, novelty,
//                          equipmentFit, fatigueRisk, total}, warnings }
// session.excluded    -> [{ challengeId, reasons }]
```

## §5.4 — `checkEngagement()`

Each drill needs ≥ 3 mechanics from the ten in the spec (countdown, limited lives,
visible score, team vs team, personal best, risk & reward, bonus target, comeback
multiplier, final-round bonus, sudden death). Every catalog entry passes; custom
challenges that don't produce a warning in selection results.

## §5.5 + §5.6 — `scoreSquadChallenge()`

Per player: attempts → anti-gaming rules → raw points → `Adjusted = Raw × Multiplier`
(foundation 0.80 / standard 1.00 / competitive 1.15 / advanced 1.30 — exact spec values;
`HANDICAP_GUIDE` carries the suggested handicaps per tier). Squad total accumulates the
adjusted scores while each player's line stays visible (§5.2).

Anti-gaming rules applied (§5.6):

- incorrect attempts earn **nothing**;
- **low-risk** attempts keep full value only up to a threshold (default 3), then decay
  geometrically (default ×0.7 each) — repeating safe actions stops paying;
- **bonus multipliers are capped** (default ×1.5);
- a **coach override** replaces the computed points for that attempt;
- players below **minimum participation** (default 1 counted attempt) are flagged and
  the squad total takes a penalty factor (default ×0.9).

```ts
import { scoreSquadChallenge } from "@/lib/pillar2";

const result = scoreSquadChallenge({
  players: [
    { playerId: "p1", name: "Aarav", difficulty: "advanced",
      attempts: [{ correct: true }, { correct: true, risk: "low" }, { correct: false }] },
    { playerId: "p2", name: "Vihaan", difficulty: "foundation",
      attempts: [{ correct: true, bonusMultiplier: 3 }] },   // capped to ×1.5
  ],
});
// result.players[i].adjustedScore, result.squadTotal, result.participation
```

## §5.7 — `computePlayerXP()` / `rankByXP()`

Exact spec weights: challenge result 0.30, technical execution 0.25, improvement 0.20,
team contribution 0.15, creativity 0.05, sportsmanship 0.05 (each component 0–100).
`rankByXP()` orders players by the blend — so the challenge winner and the top XP scorer
can legitimately be different players, which is the point of the model.

## Where it surfaces

- **Page:** [`/drills`](../src/app/(dashboard)/drills/page.tsx) — staff workspace, runs
  the engine locally in the browser (no login / DB needed, like `/matches` for Pillar 4):
  challenge picker with score breakdowns, live attempt scoring with the anti-gaming
  rules, and the weighted XP board.
- **Session plans:** `session_plans.challenges` (jsonb) is ready to receive
  `selectChallenges()` output via `POST /api/plans/generate` once squad rosters live in
  the DB — same TODO as the Pillar 4 engine.
