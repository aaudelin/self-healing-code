'use client';

import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

import { RunTimeline } from '@/components/run-timeline';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';
import { formatDate, formatDuration } from '@/lib/utils';

export default function RunDetailPage() {
  const params = useParams();
  const pipelineId = params.id as string;
  const runId = params.runId as string;

  const { data: run, isLoading, refetch } = trpc.run.getById.useQuery(
    { runId },
    { enabled: !!runId },
  );

  // Poll for updates while run is in progress
  useEffect(() => {
    if (run?.status === 'RUNNING' || run?.status === 'PENDING') {
      const interval = setInterval(() => {
        refetch();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [run?.status, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading run details...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Run not found</h3>
        <Button className="mt-4" asChild>
          <Link href={`/pipelines/${pipelineId}`}>Go back</Link>
        </Button>
      </div>
    );
  }

  const isRunning = run.status === 'RUNNING' || run.status === 'PENDING';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/pipelines/${pipelineId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Pipeline Run</h1>
            <StatusBadge status={run.status} />
            {isRunning && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Started {formatDate(run.startedAt)}
            {run.endedAt && ` - Duration: ${formatDuration(run.startedAt, run.endedAt)}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isRunning}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Execution Timeline</CardTitle>
          <CardDescription>
            Step-by-step progress of the pipeline execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RunTimeline steps={run.steps || []} />
        </CardContent>
      </Card>
    </div>
  );
}
