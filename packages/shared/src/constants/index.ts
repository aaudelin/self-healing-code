export const STEP_NAMES = {
  LOG_INGESTION: 'Log Ingestion',
  REPOSITORY_CLONE: 'Repository Clone',
  SCHEMA_INSPECTION: 'Schema Inspection',
  ANALYSIS: 'Analysis',
  REMEDIATION: 'Remediation',
  TICKET_UPDATE: 'Ticket Update',
} as const;

export const STEP_ORDER = [
  'LOG_INGESTION',
  'REPOSITORY_CLONE',
  'SCHEMA_INSPECTION',
  'ANALYSIS',
  'REMEDIATION',
  'TICKET_UPDATE',
] as const;

export const RUN_STATUS_LABELS = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  PARTIALLY_FAILED: 'Partially Failed',
  NO_ERRORS: 'No Errors Found',
} as const;

export const STEP_STATUS_LABELS = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
} as const;

export const INTEGRATION_ROLE_LABELS = {
  LOGS: 'Logs Provider',
  REPOSITORY: 'Code Repository',
  DATABASE: 'Database',
  TICKETING: 'Ticketing System',
} as const;

export const PROVIDER_OPTIONS = {
  LOGS: [{ value: 'vercel', label: 'Vercel' }],
  REPOSITORY: [{ value: 'github', label: 'GitHub' }],
  DATABASE: [{ value: 'supabase', label: 'Supabase' }],
  TICKETING: [{ value: 'linear', label: 'Linear' }],
} as const;

export const REMEDIATION_CONFIDENCE_THRESHOLD = 0.8;
