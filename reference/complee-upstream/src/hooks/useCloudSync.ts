// Complee — Sync local Zustand state with Supabase when authenticated.
// - On login: list cloud workspaces, ensure at least one exists, set active.
// - On active workspace change: hydrate profile + step-progress from cloud.
// - Debounced upserts on profile / progress changes (scoped to active workspace).

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAssessment } from "@/store/assessment";
import { useStepProgress } from "@/store/stepProgress";
import { useWorkspaces, type WorkspaceMeta } from "@/store/workspaces";
import type { CountryCode, InstitutionType } from "@/data/requirements";

export function getCurrentAssessmentId() {
  return useWorkspaces.getState().activeId;
}

function rowToMeta(row: {
  id: string;
  company_name: string;
  home_country: string;
  target_country: string;
  institution_type: string;
  updated_at: string;
}): WorkspaceMeta {
  return {
    id: row.id,
    companyName: row.company_name,
    homeCountry: row.home_country as CountryCode,
    targetCountry: row.target_country as CountryCode,
    institutionType: row.institution_type as InstitutionType,
    updatedAt: row.updated_at,
  };
}

async function fetchWorkspaces(userId: string): Promise<WorkspaceMeta[]> {
  const { data } = await supabase
    .from("assessments")
    .select("id,company_name,home_country,target_country,institution_type,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(rowToMeta);
}

async function loadAssessmentInto(assessmentId: string) {
  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!data) return;
  useAssessment.getState().setProfile({
    companyName: data.company_name,
    homeCountry: data.home_country as CountryCode,
    targetCountry: data.target_country as CountryCode,
    institutionType: data.institution_type as InstitutionType,
  });
  if (Array.isArray(data.selected_services)) {
    useAssessment.getState().setSelectedServices(data.selected_services as string[]);
  }
  useAssessment.getState().setAssessmentResults((data.results as never) ?? null);
}

async function loadProgressFor(userId: string, assessmentId: string) {
  const { data } = await supabase
    .from("step_progress")
    .select("requirement_id,status,completed_substeps,form_inputs,notes,updated_at")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId);
  useStepProgress.getState().reset();
  if (data && data.length > 0) {
    useStepProgress.getState().hydrate(data as never);
  }
}

async function createInitialAssessment(userId: string): Promise<WorkspaceMeta | null> {
  const { profile, selectedServices, assessmentResults } = useAssessment.getState();
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      user_id: userId,
      company_name: profile.companyName,
      home_country: profile.homeCountry,
      target_country: profile.targetCountry,
      institution_type: profile.institutionType,
      selected_services: selectedServices,
      results: assessmentResults as never,
    })
    .select("id,company_name,home_country,target_country,institution_type,updated_at")
    .single();
  if (error || !data) return null;
  return rowToMeta(data);
}

/**
 * Switch the active workspace. Loads its profile, services, results and
 * step-progress from Supabase into the local Zustand stores.
 */
export async function switchWorkspace(assessmentId: string) {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) return;
  useWorkspaces.getState().setActiveId(assessmentId);
  await loadAssessmentInto(assessmentId);
  await loadProgressFor(userId, assessmentId);
  // refresh meta list
  const list = await fetchWorkspaces(userId);
  useWorkspaces.getState().setWorkspaces(list);
}

/**
 * Duplicate the currently active workspace. Copies profile + services into a
 * brand-new assessment row but clears results and step-progress so the user
 * can re-run the analysis for a different target country.
 */
export async function duplicateActiveWorkspace(opts: {
  newTargetCountry?: CountryCode;
  newCompanyName?: string;
}): Promise<WorkspaceMeta | null> {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) return null;
  const { profile, selectedServices } = useAssessment.getState();
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      user_id: userId,
      company_name: opts.newCompanyName ?? profile.companyName,
      home_country: profile.homeCountry,
      target_country: opts.newTargetCountry ?? profile.targetCountry,
      institution_type: profile.institutionType,
      selected_services: selectedServices,
      results: null,
    })
    .select("id,company_name,home_country,target_country,institution_type,updated_at")
    .single();
  if (error || !data) return null;
  const meta = rowToMeta(data);
  useWorkspaces.getState().upsertWorkspace(meta);
  await switchWorkspace(meta.id);
  return meta;
}

/** Delete a workspace from cloud + local list. */
export async function deleteWorkspace(assessmentId: string) {
  await supabase.from("assessments").delete().eq("id", assessmentId);
  useWorkspaces.getState().removeWorkspace(assessmentId);
}

export function useCloudSync() {
  const { user } = useAuth();
  const lastProfileSync = useRef(0);
  const lastProgressSync = useRef<Record<string, number>>({});

  // On login: load list of workspaces, choose / create active one.
  useEffect(() => {
    if (!user) {
      useWorkspaces.getState().setActiveId(null);
      return;
    }
    (async () => {
      const list = await fetchWorkspaces(user.id);
      useWorkspaces.getState().setWorkspaces(list);

      let active = useWorkspaces.getState().activeId;
      // If saved active is stale, drop it
      if (active && !list.some((w) => w.id === active)) active = null;

      if (!active) {
        if (list.length > 0) {
          active = list[0].id;
        } else {
          const created = await createInitialAssessment(user.id);
          if (created) {
            useWorkspaces.getState().upsertWorkspace(created);
            active = created.id;
          }
        }
      }
      if (active) {
        useWorkspaces.getState().setActiveId(active);
        await loadAssessmentInto(active);
        await loadProgressFor(user.id, active);
      }
    })();
  }, [user]);

  // Sync assessment changes (profile, services, results) → only for active workspace
  useEffect(() => {
    if (!user) return;
    const unsub = useAssessment.subscribe((state) => {
      const id = useWorkspaces.getState().activeId;
      if (!id) return;
      const now = Date.now();
      if (now - lastProfileSync.current < 800) return;
      lastProfileSync.current = now;
      void supabase
        .from("assessments")
        .update({
          company_name: state.profile.companyName,
          home_country: state.profile.homeCountry,
          target_country: state.profile.targetCountry,
          institution_type: state.profile.institutionType,
          selected_services: state.selectedServices,
          results: state.assessmentResults as never,
        })
        .eq("id", id)
        .then(() => {
          // refresh meta in switcher list
          useWorkspaces.getState().upsertWorkspace({
            id,
            companyName: state.profile.companyName,
            homeCountry: state.profile.homeCountry,
            targetCountry: state.profile.targetCountry,
            institutionType: state.profile.institutionType,
            updatedAt: new Date().toISOString(),
          });
        });
    });
    return () => unsub();
  }, [user]);

  // Sync per-step progress for active workspace
  useEffect(() => {
    if (!user) return;
    const unsub = useStepProgress.subscribe((state, prev) => {
      const id = useWorkspaces.getState().activeId;
      if (!id) return;
      for (const key of Object.keys(state.byKey)) {
        const cur = state.byKey[key];
        const before = prev.byKey[key];
        if (before && before.updatedAt === cur.updatedAt) continue;
        const last = lastProgressSync.current[key] ?? 0;
        const now = Date.now();
        if (now - last < 600) continue;
        lastProgressSync.current[key] = now;
        void supabase.from("step_progress").upsert(
          {
            user_id: user.id,
            assessment_id: id,
            requirement_id: key,
            status: cur.status,
            completed_substeps: cur.completedSubsteps as never,
            form_inputs: cur.formInputs as never,
            notes: cur.notes ?? null,
            completed_at: cur.status === "done" ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,assessment_id,requirement_id" },
        );
      }
    });
    return () => unsub();
  }, [user]);
}
