export type {
  ActivityEventType,
  Database,
  IssuePriority,
  IssueStatus,
  Role,
  SessionStatus,
} from './database'

export type SessionConnectionPhase =
  | 'idle'
  | 'signaling'
  | 'connected'
  | 'closing'
  | 'failed'
