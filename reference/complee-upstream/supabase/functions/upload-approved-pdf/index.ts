// Complee — Reviewer-approved PDF uploader.
// Reviewers cannot write to the owner's `documents/{ownerId}/...` folder via
// RLS. This function accepts a base64 PDF stamped client-side with the
// auditor's signature, verifies the caller is an active reviewer for the
// document's workspace, and uploads it under the owner's folder using the
// service role. Returns the new storage path so the client can update
// `signed_documents.signed_storage_path`.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  documentId: string;
  pdfBase64: string;
  fileName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as Body;
    if (!body.documentId || !body.pdfBase64 || !body.fileName) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Look up the document and verify caller is an active reviewer for it.
    const { data: doc, error: docErr } = await admin
      .from("signed_documents")
      .select("id, user_id, assessment_id, name")
      .eq("id", body.documentId)
      .single();
    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!doc.assessment_id) {
      return new Response(
        JSON.stringify({ error: "Document not part of a workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: isReviewer } = await admin.rpc("is_workspace_reviewer", {
      _assessment_id: doc.assessment_id,
      _user_id: userId,
    });
    if (!isReviewer) {
      return new Response(JSON.stringify({ error: "Not a reviewer for this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 → bytes.
    const binary = atob(body.pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    const ts = Date.now();
    const safeName = body.fileName.replace(/\.pdf$/i, "").replace(/[^a-z0-9_\- ]/gi, "_");
    const newPath = `${doc.user_id}/signed/${ts}-approved-${safeName}.pdf`;

    const { error: upErr } = await admin.storage
      .from("documents")
      .upload(newPath, bytes, { contentType: "application/pdf", upsert: false });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ path: newPath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
