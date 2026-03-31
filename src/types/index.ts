export type {
  ActivityEventType,
  Database,
  IssuePriority,
  IssueStatus,
  Role,
  SessionStatus,
} from './database'

export type SessionConnectionPhase =
  | 'awaiting-user-acceptance'
  | 'awaiting-rustdesk-install'
  | 'awaiting-otp'
  | 'awaiting-rustdesk-credentials'
  | 'ready-for-technician'
  | 'active'
  | 'closing'
  | 'failed'
