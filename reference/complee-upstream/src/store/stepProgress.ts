// Complee — Per-step progress: substeps checked + structured form inputs.
// Persisted locally + synced to Supabase when authenticated.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type StepStatus = "todo" | "in_progress" | "done";

export interface StepProgress {
  status: StepStatus;
  completedSubsteps: string[];
  formInputs: Record<string, string>;
  notes?: string;
  updatedAt: string;
}

interface State {
  byKey: Record<string, StepProgress>;
  setStatus: (key: string, status: StepStatus) => void;
  toggleSubstep: (key: string, substepId: string) => void;
  setSubstepDone: (key: string, substepId: string, done: boolean) => void;
  setInput: (key: string, fieldId: string, value: string) => void;
  setNotes: (key: string, notes: string) => void;
  hydrate: (rows: { requirement_id: string; status: string; completed_substeps: unknown; form_inputs: unknown; notes: string | null; updated_at: string }[]) => void;
  reset: () => void;
}

const empty = (): StepProgress => ({
  status: "todo",
  completedSubsteps: [],
  formInputs: {},
  updatedAt: new Date().toISOString(),
});

export const useStepProgress = create<State>()(
  persist(
    (set) => ({
      byKey: {},
      setStatus: (key, status) =>
        set((s) => ({
          byKey: {
            ...s.byKey,
            [key]: { ...(s.byKey[key] ?? empty()), status, updatedAt: new Date().toISOString() },
          },
        })),
      toggleSubstep: (key, substepId) =>
        set((s) => {
          const cur = s.byKey[key] ?? empty();
          const exists = cur.completedSubsteps.includes(substepId);
          const next = exists
            ? cur.completedSubsteps.filter((x) => x !== substepId)
            : [...cur.completedSubsteps, substepId];
          return {
            byKey: {
              ...s.byKey,
              [key]: { ...cur, completedSubsteps: next, updatedAt: new Date().toISOString() },
            },
          };
        }),
      setSubstepDone: (key, substepId, done) =>
        set((s) => {
          const cur = s.byKey[key] ?? empty();
          const has = cur.completedSubsteps.includes(substepId);
          if (done && has) return s;
          if (!done && !has) return s;
          const next = done
            ? [...cur.completedSubsteps, substepId]
            : cur.completedSubsteps.filter((x) => x !== substepId);
          return {
            byKey: {
              ...s.byKey,
              [key]: { ...cur, completedSubsteps: next, updatedAt: new Date().toISOString() },
            },
          };
        }),
      setInput: (key, fieldId, value) =>
        set((s) => {
          const cur = s.byKey[key] ?? empty();
          return {
            byKey: {
              ...s.byKey,
              [key]: {
                ...cur,
                formInputs: { ...cur.formInputs, [fieldId]: value },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),
      setNotes: (key, notes) =>
        set((s) => {
          const cur = s.byKey[key] ?? empty();
          return {
            byKey: {
              ...s.byKey,
              [key]: { ...cur, notes, updatedAt: new Date().toISOString() },
            },
          };
        }),
      hydrate: (rows) =>
        set(() => {
          const byKey: Record<string, StepProgress> = {};
          for (const r of rows) {
            byKey[r.requirement_id] = {
              status: (r.status as StepStatus) ?? "todo",
              completedSubsteps: Array.isArray(r.completed_substeps)
                ? (r.completed_substeps as string[])
                : [],
              formInputs:
                r.form_inputs && typeof r.form_inputs === "object"
                  ? (r.form_inputs as Record<string, string>)
                  : {},
              notes: r.notes ?? undefined,
              updatedAt: r.updated_at,
            };
          }
          return { byKey };
        }),
      reset: () => set({ byKey: {} }),
    }),
    {
      name: "complee_step_progress_v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
