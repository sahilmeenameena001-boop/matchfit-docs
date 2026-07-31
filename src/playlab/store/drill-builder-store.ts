import { create } from "zustand";
import type {
  CompetitionFormat,
  DrillConstraints,
  EngagementMechanic,
  ExperienceTag,
  FootballObjective,
} from "@/playlab/types";

interface BuilderState {
  step: number;
  primaryObjective: FootballObjective;
  secondaryObjectives: FootballObjective[];
  reason: string;
  experience: ExperienceTag[];
  format: CompetitionFormat;
  mechanics: EngagementMechanic[];
  constraints: DrillConstraints;
  setStep: (s: number) => void;
  set: <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => void;
  toggleSecondary: (o: FootballObjective) => void;
  toggleExperience: (t: ExperienceTag) => void;
  toggleMechanic: (m: EngagementMechanic) => void;
  setConstraint: <K extends keyof DrillConstraints>(k: K, v: DrillConstraints[K]) => void;
  reset: () => void;
}

const DEFAULT_CONSTRAINTS: DrillConstraints = {
  players: 18,
  teams: 3,
  activePlayersPerRound: 3,
  durationMin: 15,
  roundSec: 60,
  transitionSec: 15,
  stations: 3,
  pitchSize: "Medium",
  setupMin: 3,
  coachCount: 2,
  intensity: "Medium",
  contactLevel: "light",
  playerLevel: "Mixed intermediate",
};

const initial = {
  step: 1,
  primaryObjective: "finishing" as FootballObjective,
  secondaryObjectives: [] as FootballObjective[],
  reason: "fill missing session component",
  experience: [] as ExperienceTag[],
  format: "team vs team" as CompetitionFormat,
  mechanics: [] as EngagementMechanic[],
  constraints: DEFAULT_CONSTRAINTS,
};

export const useDrillBuilder = create<BuilderState>((set, get) => ({
  ...initial,
  setStep: (step) => set({ step }),
  set: (key, value) => set({ [key]: value } as Partial<BuilderState>),
  toggleSecondary: (o) => {
    const cur = get().secondaryObjectives;
    set({
      secondaryObjectives: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o].slice(0, 2),
    });
  },
  toggleExperience: (t) => {
    const cur = get().experience;
    set({
      experience: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].slice(0, 3),
    });
  },
  toggleMechanic: (m) => {
    const cur = get().mechanics;
    set({ mechanics: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] });
  },
  setConstraint: (k, v) =>
    set({ constraints: { ...get().constraints, [k]: v } }),
  reset: () => set(initial),
}));
