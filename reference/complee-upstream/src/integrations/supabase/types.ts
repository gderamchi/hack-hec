export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          company_name: string
          created_at: string
          final_document_generated_at: string | null
          home_country: string
          id: string
          institution_type: string
          results: Json | null
          selected_services: Json
          target_country: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          final_document_generated_at?: string | null
          home_country: string
          id?: string
          institution_type: string
          results?: Json | null
          selected_services?: Json
          target_country: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          final_document_generated_at?: string | null
          home_country?: string
          id?: string
          institution_type?: string
          results?: Json | null
          selected_services?: Json
          target_country?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_name: string
          actor_role: string
          actor_user_id: string | null
          assessment_id: string
          created_at: string
          event_hash: string
          id: string
          metadata: Json
          prev_hash: string | null
          signed_document_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_name: string
          actor_role: string
          actor_user_id?: string | null
          assessment_id: string
          created_at?: string
          event_hash: string
          id?: string
          metadata?: Json
          prev_hash?: string | null
          signed_document_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_name?: string
          actor_role?: string
          actor_user_id?: string | null
          assessment_id?: string
          created_at?: string
          event_hash?: string
          id?: string
          metadata?: Json
          prev_hash?: string | null
          signed_document_id?: string | null
        }
        Relationships: []
      }
      document_comments: {
        Row: {
          assessment_id: string
          author_name: string
          author_role: string
          author_user_id: string
          body: string
          created_at: string
          id: string
          page: number
          pos_x: number
          pos_y: number
          resolved_at: string | null
          resolved_by: string | null
          signed_document_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          author_name: string
          author_role: string
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          page?: number
          pos_x?: number
          pos_y?: number
          resolved_at?: string | null
          resolved_by?: string | null
          signed_document_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          author_name?: string
          author_role?: string
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          page?: number
          pos_x?: number
          pos_y?: number
          resolved_at?: string | null
          resolved_by?: string | null
          signed_document_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_signed_document_id_fkey"
            columns: ["signed_document_id"]
            isOneToOne: false
            referencedRelation: "signed_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signed_documents: {
        Row: {
          assessment_id: string | null
          created_at: string
          doc_type: string
          id: string
          name: string
          requirement_id: string | null
          review_notes: string | null
          review_status: Database["public"]["Enums"]["document_review_status"]
          reviewer_name: string | null
          reviewer_signature_data: string | null
          reviewer_signed_at: string | null
          reviewer_user_id: string | null
          signature_hash: string | null
          signature_method: string | null
          signed_at: string | null
          signed_ip: string | null
          signed_storage_path: string | null
          signed_user_agent: string | null
          signer_name: string | null
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          name: string
          requirement_id?: string | null
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["document_review_status"]
          reviewer_name?: string | null
          reviewer_signature_data?: string | null
          reviewer_signed_at?: string | null
          reviewer_user_id?: string | null
          signature_hash?: string | null
          signature_method?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          signed_storage_path?: string | null
          signed_user_agent?: string | null
          signer_name?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          name?: string
          requirement_id?: string | null
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["document_review_status"]
          reviewer_name?: string | null
          reviewer_signature_data?: string | null
          reviewer_signed_at?: string | null
          reviewer_user_id?: string | null
          signature_hash?: string | null
          signature_method?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          signed_storage_path?: string | null
          signed_user_agent?: string | null
          signer_name?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signed_documents_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      step_progress: {
        Row: {
          assessment_id: string
          completed_at: string | null
          completed_substeps: Json
          created_at: string
          form_inputs: Json
          id: string
          notes: string | null
          requirement_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          completed_substeps?: Json
          created_at?: string
          form_inputs?: Json
          id?: string
          notes?: string | null
          requirement_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          completed_substeps?: Json
          created_at?: string
          form_inputs?: Json
          id?: string
          notes?: string | null
          requirement_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_progress_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_reviewers: {
        Row: {
          accepted_at: string | null
          assessment_id: string
          id: string
          invite_token: string
          invited_at: string
          invited_by: string
          invited_email: string
          message: string | null
          permission: Database["public"]["Enums"]["reviewer_permission"]
          reviewer_user_id: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["reviewer_status"]
        }
        Insert: {
          accepted_at?: string | null
          assessment_id: string
          id?: string
          invite_token?: string
          invited_at?: string
          invited_by: string
          invited_email: string
          message?: string | null
          permission?: Database["public"]["Enums"]["reviewer_permission"]
          reviewer_user_id?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["reviewer_status"]
        }
        Update: {
          accepted_at?: string | null
          assessment_id?: string
          id?: string
          invite_token?: string
          invited_at?: string
          invited_by?: string
          invited_email?: string
          message?: string | null
          permission?: Database["public"]["Enums"]["reviewer_permission"]
          reviewer_user_id?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["reviewer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "workspace_reviewers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_reviewer_document_object: {
        Args: { _path: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_reviewer: {
        Args: { _assessment_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "fintech_owner" | "reviewer" | "admin"
      audit_action:
        | "document_created"
        | "document_signed"
        | "document_sent_to_reviewer"
        | "document_approved"
        | "document_changes_requested"
        | "comment_added"
        | "comment_resolved"
        | "reviewer_invited"
        | "reviewer_accepted"
        | "submission_pack_exported"
      document_review_status:
        | "draft"
        | "awaiting_review"
        | "changes_requested"
        | "approved"
      reviewer_permission: "read" | "comment" | "approve"
      reviewer_status: "pending" | "active" | "revoked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["fintech_owner", "reviewer", "admin"],
      audit_action: [
        "document_created",
        "document_signed",
        "document_sent_to_reviewer",
        "document_approved",
        "document_changes_requested",
        "comment_added",
        "comment_resolved",
        "reviewer_invited",
        "reviewer_accepted",
        "submission_pack_exported",
      ],
      document_review_status: [
        "draft",
        "awaiting_review",
        "changes_requested",
        "approved",
      ],
      reviewer_permission: ["read", "comment", "approve"],
      reviewer_status: ["pending", "active", "revoked"],
    },
  },
} as const
