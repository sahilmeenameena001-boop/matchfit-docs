/**
 * Pillar 2 · §5.1 — the example challenge library, tagged per §5.3.
 * Every entry carries at least three §5.4 engagement mechanics.
 * Coaches can pass their own Challenge[] to the selector; this catalog is
 * the built-in default so the engine works out of the box.
 */
import type { Challenge } from "./types";

export const CHALLENGE_CATALOG: Challenge[] = [
  {
    id: "passing-gate",
    name: "Passing Gate Challenge",
    description:
      "Hit passes through cone gates of shrinking width against the clock; bonus gate is worth double.",
    skillFocus: ["passing", "first_touch"],
    intensity: "medium",
    complexity: "simple",
    space: "medium",
    equipment: ["cones", "balls"],
    minPlayers: 2,
    contactLevel: "none",
    novelty: 0.4,
    mechanics: ["countdown", "visible_score", "personal_best", "bonus_target"],
  },
  {
    id: "dribble-elimination",
    name: "Dribble Elimination",
    description:
      "Everyone dribbles inside a shrinking grid while knocking out other balls; last three lives standing win.",
    skillFocus: ["dribbling", "awareness"],
    intensity: "high",
    complexity: "simple",
    space: "medium",
    equipment: ["balls", "cones"],
    minPlayers: 4,
    contactLevel: "light",
    novelty: 0.5,
    mechanics: ["limited_lives", "sudden_death", "visible_score"],
  },
  {
    id: "target-finishing",
    name: "Target Finishing",
    description:
      "Finish at corner targets from rotating angles; the final round is worth double points.",
    skillFocus: ["finishing"],
    intensity: "medium",
    complexity: "simple",
    space: "large",
    equipment: ["balls", "goals", "cones"],
    minPlayers: 2,
    contactLevel: "none",
    novelty: 0.35,
    mechanics: ["bonus_target", "personal_best", "visible_score", "final_round_bonus"],
  },
  {
    id: "reaction-race",
    name: "Reaction Race",
    description:
      "Sprint to the called colour, first touch on the ball wins the duel; ties go to sudden death.",
    skillFocus: ["reactions"],
    intensity: "high",
    complexity: "simple",
    space: "small",
    equipment: ["cones", "balls"],
    minPlayers: 2,
    contactLevel: "none",
    novelty: 0.45,
    mechanics: ["countdown", "team_vs_team", "sudden_death"],
  },
  {
    id: "capture-the-zone",
    name: "Capture the Zone",
    description:
      "Teams hold marked zones by keeping possession inside them; losing teams earn a comeback multiplier.",
    skillFocus: ["possession", "awareness"],
    intensity: "high",
    complexity: "moderate",
    space: "large",
    equipment: ["bibs", "cones", "balls"],
    minPlayers: 8,
    contactLevel: "light",
    novelty: 0.7,
    mechanics: ["team_vs_team", "risk_reward", "comeback_multiplier", "visible_score"],
  },
  {
    id: "passing-combinations-time",
    name: "Passing Combinations Against Time",
    description:
      "Complete set passing patterns before the countdown ends; clean sequences bank points, errors reset the chain.",
    skillFocus: ["passing", "awareness"],
    intensity: "medium",
    complexity: "moderate",
    space: "medium",
    equipment: ["balls", "cones"],
    minPlayers: 3,
    contactLevel: "none",
    novelty: 0.4,
    mechanics: ["countdown", "visible_score", "personal_best", "final_round_bonus"],
  },
  {
    id: "defend-the-cone",
    name: "Defending the Cone",
    description:
      "Protect your cone from attackers 1v1; three cone hits and you're out, last defender standing wins.",
    skillFocus: ["defending"],
    intensity: "medium",
    complexity: "simple",
    space: "small",
    equipment: ["cones", "balls"],
    minPlayers: 2,
    contactLevel: "light",
    novelty: 0.5,
    mechanics: ["limited_lives", "team_vs_team", "sudden_death"],
  },
  {
    id: "possession-escape",
    name: "Possession Escape",
    description:
      "Keep the ball under pressure, then break out through an escape gate for bonus points — riskier gates pay more.",
    skillFocus: ["possession", "first_touch"],
    intensity: "high",
    complexity: "complex",
    space: "medium",
    equipment: ["bibs", "balls", "cones"],
    minPlayers: 6,
    contactLevel: "light",
    novelty: 0.65,
    mechanics: ["risk_reward", "team_vs_team", "countdown", "comeback_multiplier"],
  },
  {
    id: "football-tic-tac-toe",
    name: "Football Tic-Tac-Toe",
    description:
      "Race in relays to place bibs on a 3×3 cone grid — three in a row wins; blocked boards go to sudden death.",
    skillFocus: ["awareness", "passing"],
    intensity: "low",
    complexity: "moderate",
    space: "small",
    equipment: ["cones", "bibs", "balls"],
    minPlayers: 2,
    contactLevel: "none",
    novelty: 0.9,
    mechanics: ["team_vs_team", "visible_score", "sudden_death", "bonus_target"],
  },
];

export const findChallenge = (id: string): Challenge | undefined =>
  CHALLENGE_CATALOG.find((c) => c.id === id);
