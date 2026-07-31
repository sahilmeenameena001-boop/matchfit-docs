/** Player-flow engine — deterministic estimates of repetitions, active time
 *  and waiting time for a drill configuration (spec §18). */
import type { DrillConstraints, DrillMetrics } from "@/types";

export function calculateFlow(c: DrillConstraints): DrillMetrics {
  const roundCycle = Math.max(1, c.roundSec + c.transitionSec);
  const roundsPossible = Math.max(0, Math.floor((c.durationMin * 60) / roundCycle));
  const stations = Math.max(1, c.stations);
  const totalPlayerSlots = roundsPossible * c.activePlayersPerRound * stations;
  const players = Math.max(1, c.players);
  const attemptsPerPlayer = totalPlayerSlots / players;

  const activePerCycle = Math.min(players, c.activePlayersPerRound * stations);
  const participationRatio = activePerCycle / players;
  const queueSize = Math.max(0, players - activePerCycle);
  // Average wait: share of each round cycle spent inactive.
  const waitingSec =
    participationRatio >= 1 ? 0 : Math.round(roundCycle * (1 - participationRatio) * (queueSize > 0 ? 1 : 0));
  const activeTimeMin =
    Math.round(((roundsPossible * c.roundSec) / 60) * participationRatio * 10) / 10;

  let flowStatus: DrillMetrics["flowStatus"] = "poor";
  if (participationRatio >= 0.65 && attemptsPerPlayer >= 4 && waitingSec <= 45) {
    flowStatus = "healthy";
  } else if (participationRatio >= 0.4 && attemptsPerPlayer >= 2 && waitingSec <= 75) {
    flowStatus = "moderate";
  }

  return {
    roundsPossible,
    attemptsPerPlayer: Math.round(attemptsPerPlayer * 10) / 10,
    activeTimeMin,
    waitingSec,
    queueSize,
    participationRatio: Math.round(participationRatio * 100) / 100,
    flowStatus,
  };
}
