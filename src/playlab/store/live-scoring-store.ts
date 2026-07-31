import { create } from "zustand";
import type { LiveEventInput } from "@/playlab/lib/actions";

interface LiveState {
  sessionDrillId: string | null;
  round: number;
  seconds: number;
  running: boolean;
  selectedPlayerId: string | null;
  selectedTeamId: string | null;
  events: LiveEventInput[];
  start: (sessionDrillId: string) => void;
  tick: () => void;
  setRunning: (r: boolean) => void;
  nextRound: () => void;
  select: (playerId: string | null, teamId: string | null) => void;
  record: (e: LiveEventInput) => void;
  undo: () => void;
  reset: () => void;
}

export const useLiveScoring = create<LiveState>((set, get) => ({
  sessionDrillId: null,
  round: 1,
  seconds: 0,
  running: false,
  selectedPlayerId: null,
  selectedTeamId: null,
  events: [],
  start: (sessionDrillId) =>
    set({ sessionDrillId, round: 1, seconds: 0, running: true, events: [], selectedPlayerId: null, selectedTeamId: null }),
  tick: () => set((s) => (s.running ? { seconds: s.seconds + 1 } : s)),
  setRunning: (running) => set({ running }),
  nextRound: () => set((s) => ({ round: s.round + 1 })),
  select: (selectedPlayerId, selectedTeamId) => set({ selectedPlayerId, selectedTeamId }),
  record: (e) => set((s) => ({ events: [...s.events, e] })),
  undo: () => set((s) => ({ events: s.events.slice(0, -1) })),
  reset: () =>
    set({ sessionDrillId: null, round: 1, seconds: 0, running: false, events: [], selectedPlayerId: null, selectedTeamId: null }),
}));
