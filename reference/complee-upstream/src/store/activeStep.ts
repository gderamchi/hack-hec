// Complee — Tracks the step the user is currently viewing in the
// RoadmapGuide drawer. Used by the floating AI Assistant to ground
// answers in the live step context.

import { create } from "zustand";

export interface ActiveStepContext {
  requirementTitle: string;
  authority: string;
  regulationReference: string;
  country: string;
  summary: string;
  substeps: { title: string; detail: string }[];
}

interface State {
  context: ActiveStepContext | null;
  set: (ctx: ActiveStepContext | null) => void;
}

export const useActiveStep = create<State>((set) => ({
  context: null,
  set: (ctx) => set({ context: ctx }),
}));
