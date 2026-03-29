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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_invites: {
        Row: {
          created_at: string
          device_id: string | null
          expires_at: string
          id: string
          invited_by: string
          invited_user_id: string
          session_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          expires_at: string
          id?: string
          invited_by: string
          invited_user_id: string
          session_id?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          session_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_invites_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_invites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "remote_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          id: string
          ip_local: string | null
          is_online: boolean
          last_seen: string | null
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_local?: string | null
          is_online?: boolean
          last_seen?: string | null
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_local?: string | null
          is_online?: boolean
          last_seen?: string | null
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          issue_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          issue_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          issue_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_attachments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          issue_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          issue_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          is_active?: boolean
          name?: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
        }
        Relationships: []
      }
      remote_sessions: {
        Row: {
          accepted_at: string | null
          connection_phase: string
          ended_at: string | null
          failure_reason: string | null
          id: string
          initiated_by: string
          issue_id: string | null
          started_at: string | null
          status: string
          target_device_id: string
        }
        Insert: {
          accepted_at?: string | null
          connection_phase?: string
          ended_at?: string | null
          failure_reason?: string | null
          id?: string
          initiated_by: string
          issue_id?: string | null
          started_at?: string | null
          status?: string
          target_device_id: string
        }
        Update: {
          accepted_at?: string | null
          connection_phase?: string
          ended_at?: string | null
          failure_reason?: string | null
          id?: string
          initiated_by?: string
          issue_id?: string | null
          started_at?: string | null
          status?: string
          target_device_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_sessions_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remote_sessions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remote_sessions_target_device_id_fkey"
            columns: ["target_device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

export type Role = 'admin-it' | 'technician' | 'user'

export type IssueStatus = 'abierto' | 'en-progreso' | 'resuelto' | 'cerrado'

export type IssuePriority = 'baja' | 'media' | 'alta' | 'critica'

export type SessionStatus =
  | 'pendiente'
  | 'aceptada'
  | 'activa'
  | 'rechazada'
  | 'fallida'
  | 'finalizada'
  | 'cancelada'

export type ActivityEventType =
  | 'issue_created'
  | 'status_changed'
  | 'issue_assigned'
  | 'comment_added'
  | 'attachment_added'
  | 'session_started'
  | 'session_ended'
  | 'session_rejected'
  | 'user_created'
  | 'user_deactivated'
  | 'user_reactivated'
