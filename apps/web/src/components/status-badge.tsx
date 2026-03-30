'use client';

import { Badge } from '@/components/ui/badge';
import type { RunStatus, StepStatus } from '@/lib/trpc/types';

interface StatusBadgeProps {
  status: RunStatus | StepStatus | 'DRAFT' | 'CONFIGURED';
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }
> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  CONFIGURED: { label: 'Configured', variant: 'success' },
  PENDING: { label: 'Pending', variant: 'secondary' },
  RUNNING: { label: 'Running', variant: 'default' },
  SUCCESS: { label: 'Success', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  PARTIALLY_FAILED: { label: 'Partial', variant: 'warning' },
  NO_ERRORS: { label: 'No Errors', variant: 'outline' },
  SKIPPED: { label: 'Skipped', variant: 'secondary' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'secondary' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
