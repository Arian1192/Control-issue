// Auto-generate this file using: npx supabase gen types typescript --project-id <id>
// Until then this provides the base structure.

export type Role = 'admin-it' | 'technician' | 'user'
export type IssueStatus = 'abierto' | 'en-progreso' | 'resuelto' | 'cerrado'
export type IssuePriority = 'baja' | 'media' | 'alta' | 'critica'
export type SessionStatus = 'pendiente' | 'activa' | 'rechazada' | 'finalizada' | 'fallida'
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Role
          name: string
          email: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      issues: {
        Row: {
          id: string
          title: string
          description: string | null
          status: IssueStatus
          priority: IssuePriority
          created_by: string
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['issues']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['issues']['Insert']>
      }
      issue_comments: {
        Row: {
          id: string
          issue_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['issue_comments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['issue_comments']['Insert']>
      }
      issue_attachments: {
        Row: {
          id: string
          issue_id: string
          storage_path: string
          file_name: string
          uploaded_by: string
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['issue_attachments']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['issue_attachments']['Insert']>
      }
      devices: {
        Row: {
          id: string
          name: string
          owner_id: string
          ip_local: string | null
          last_seen: string | null
          is_online: boolean
        }
        Insert: Omit<Database['public']['Tables']['devices']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['devices']['Insert']>
      }
      remote_sessions: {
        Row: {
          id: string
          issue_id: string | null
          initiated_by: string
          target_device_id: string
          status: SessionStatus
          started_at: string | null
          ended_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['remote_sessions']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['remote_sessions']['Insert']>
      }
      activity_log: {
        Row: {
          id: string
          type: ActivityEventType
          actor_id: string | null
          entity_type: string | null
          entity_id: string | null
          metadata: Record<string, string | null>
          created_at: string
        }
        Insert: never
        Update: never
      }
    }
  }
}
