export interface AnalysisReport {
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  rootCause: string;
  affectedFiles: string[];
  suggestedFix: string;
  confidence: number;
}

export interface RemediationResult {
  applied: boolean;
  changes: FileChange[];
  pullRequestUrl?: string;
  ticketUrl?: string;
  message: string;
}

export interface FileChange {
  path: string;
  diff: string;
  description: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  source?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export interface DatabaseSchema {
  tables: TableSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  indexes?: IndexSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface RepositoryContext {
  files: RepositoryFile[];
  structure: string;
}

export interface RepositoryFile {
  path: string;
  content: string;
}
