"use client";

import { create } from "zustand";

interface GameEvent {
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
}

interface GameStore {
  pendingEvent: GameEvent | null;
  triggerEvent: (event: GameEvent) => void;
  clearEvent: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  pendingEvent: null,
  triggerEvent: (event) => set({ pendingEvent: event }),
  clearEvent: () => set({ pendingEvent: null }),
}));
