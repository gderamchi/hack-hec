// Complee — Workspaces (= multiple Authorisation Packages per user).
// Each workspace is one row in `assessments`. The active id drives sync.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CountryCode, InstitutionType } from "@/data/requirements";

export interface WorkspaceMeta {
  id: string;
  companyName: string;
  homeCountry: CountryCode;
  targetCountry: CountryCode;
  institutionType: InstitutionType;
  updatedAt: string;
}

interface State {
  workspaces: WorkspaceMeta[];
  activeId: string | null;
  setWorkspaces: (w: WorkspaceMeta[]) => void;
  upsertWorkspace: (w: WorkspaceMeta) => void;
  removeWorkspace: (id: string) => void;
  setActiveId: (id: string | null) => void;
}

export const useWorkspaces = create<State>()(
  persist(
    (set) => ({
      workspaces: [],
      activeId: null,
      setWorkspaces: (workspaces) => set({ workspaces }),
      upsertWorkspace: (w) =>
        set((s) => {
          const idx = s.workspaces.findIndex((x) => x.id === w.id);
          if (idx === -1) return { workspaces: [w, ...s.workspaces] };
          const next = [...s.workspaces];
          next[idx] = w;
          return { workspaces: next };
        }),
      removeWorkspace: (id) =>
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),
      setActiveId: (activeId) => set({ activeId }),
    }),
    {
      name: "complee_workspaces_v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
