'use client';

import { Play, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Pipeline, PipelineRun } from '@/lib/trpc/types';
import { formatDate } from '@/lib/utils';

interface PipelineCardProps {
  pipeline: Pipeline & { runs?: PipelineRun[] };
  onTrigger: (id: string) => void;
  onDelete: (id: string) => void;
  isTriggering?: boolean;
}

export function PipelineCard({
  pipeline,
  onTrigger,
  onDelete,
  isTriggering,
}: PipelineCardProps) {
  const lastRun = pipeline.runs?.[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              <Link
                href={`/pipelines/${pipeline.id}`}
                className="hover:underline"
              >
                {pipeline.name}
              </Link>
            </CardTitle>
            {pipeline.description && (
              <CardDescription className="mt-1">
                {pipeline.description}
              </CardDescription>
            )}
          </div>
          <StatusBadge status={pipeline.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {lastRun ? (
            <div className="flex items-center gap-2">
              <span>Last run:</span>
              <StatusBadge status={lastRun.status} />
              <span>{formatDate(lastRun.startedAt)}</span>
            </div>
          ) : (
            <span>No runs yet</span>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onTrigger(pipeline.id)}
          disabled={pipeline.status !== 'CONFIGURED' || isTriggering}
        >
          <Play className="mr-2 h-4 w-4" />
          {isTriggering ? 'Running...' : 'Run'}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/pipelines/${pipeline.id}/edit`}>
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(pipeline.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
