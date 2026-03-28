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
  | 'offer_sent'
  | 'answer_received'
  | 'connected'
  | 'failed'
