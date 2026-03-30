'use client';

import { CheckCircle2, Circle, Loader2, XCircle, SkipForward } from 'lucide-react';

import { cn, formatDuration } from '@/lib/utils';
import type { RunStep, StepStatus } from '@/lib/trpc/types';

interface RunTimelineProps {
  steps: RunStep[];
}

const stepIcons: Record<StepStatus, React.ReactNode> = {
  PENDING: <Circle className="h-5 w-5 text-muted-foreground" />,
  RUNNING: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
  SUCCESS: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  FAILED: <XCircle className="h-5 w-5 text-red-500" />,
  SKIPPED: <SkipForward className="h-5 w-5 text-muted-foreground" />,
};

export function RunTimeline({ steps }: RunTimelineProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            {stepIcons[step.status]}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-0.5 flex-1 mt-2',
                  step.status === 'SUCCESS'
                    ? 'bg-green-500'
                    : step.status === 'FAILED'
                      ? 'bg-red-500'
                      : 'bg-muted',
                )}
              />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{step.name}</h4>
              {step.startedAt && (
                <span className="text-sm text-muted-foreground">
                  {formatDuration(step.startedAt, step.endedAt)}
                </span>
              )}
            </div>
            {step.error && (
              <p className="mt-1 text-sm text-red-500">{step.error}</p>
            )}
            {step.output && step.status === 'SUCCESS' && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  View output
                </summary>
                <pre className="mt-2 rounded-md bg-muted p-4 text-xs overflow-auto max-h-64">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
