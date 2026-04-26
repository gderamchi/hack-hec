// Complee — Determine the effective role for the current user.
// A user is treated as "reviewer" mode when they have the `reviewer` role
// and own no assessments themselves. Owners always see the full app.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type EffectiveRole = "owner" | "reviewer" | "loading" | "anonymous";

export function useUserRole(): EffectiveRole {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<EffectiveRole>("loading");

  useEffect(() => {
    let cancelled = false;
    const determine = async () => {
      if (loading) {
        setRole("loading");
        return;
      }
      if (!user) {
        setRole("anonymous");
        return;
      }

      // Run role + assessment ownership lookups in parallel
      const [{ data: roles }, { data: ownedAssessments }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("assessments").select("id").eq("user_id", user.id).limit(1),
      ]);

      if (cancelled) return;

      const isReviewer = (roles ?? []).some((r) => r.role === "reviewer");
      const ownsAssessments = (ownedAssessments ?? []).length > 0;

      // Reviewer-only: has reviewer role AND no owned assessments
      // (otherwise they're a fintech owner who happens to also review elsewhere)
      if (isReviewer && !ownsAssessments) {
        setRole("reviewer");
      } else {
        setRole("owner");
      }
    };
    void determine();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return role;
}
