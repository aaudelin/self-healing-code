'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/trpc/client';
import { formatDate } from '@/lib/utils';
import type { IntegrationRole } from '@/lib/trpc/types';
import { INTEGRATION_ROLE_LABELS } from '@aiops/shared';

export default function PipelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isTriggering, setIsTriggering] = useState(false);

  const pipelineId = params.id as string;

  const { data: pipeline, isLoading } = trpc.pipeline.getById.useQuery(
    { id: pipelineId },
    { enabled: !!pipelineId },
  );

  const triggerMutation = trpc.run.trigger.useMutation({
    onSuccess: (run) => {
      toast({ title: 'Pipeline run started' });
      router.push(`/pipelines/${pipelineId}/runs/${run.id}`);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setIsTriggering(false);
    },
  });

  const handleTrigger = () => {
    setIsTriggering(true);
    triggerMutation.mutate({ pipelineId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading pipeline...</div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Pipeline not found</h3>
        <Button className="mt-4" asChild>
          <Link href="/">Go back</Link>
        </Button>
      </div>
    );
  }

  const integrationsByRole = new Map(
    pipeline.integrations?.map((i) => [i.role, i]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{pipeline.name}</h1>
            <StatusBadge status={pipeline.status} />
          </div>
          {pipeline.description && (
            <p className="text-muted-foreground mt-1">{pipeline.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleTrigger}
            disabled={pipeline.status !== 'CONFIGURED' || isTriggering}
          >
            <Play className="mr-2 h-4 w-4" />
            {isTriggering ? 'Starting...' : 'Run Pipeline'}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/pipelines/${pipelineId}/edit`}>
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Configured integrations for this pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['LOGS', 'REPOSITORY', 'DATABASE', 'TICKETING'] as IntegrationRole[]).map(
                (role) => {
                  const integration = integrationsByRole.get(role);
                  return (
                    <div
                      key={role}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <span className="text-sm font-medium">
                        {INTEGRATION_ROLE_LABELS[role]}
                      </span>
                      {integration ? (
                        <span className="text-sm text-green-600">
                          {integration.provider}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Not configured
                        </span>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Runs</CardTitle>
            <CardDescription>Last 10 pipeline executions</CardDescription>
          </CardHeader>
          <CardContent>
            {pipeline.runs?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No runs yet</p>
            ) : (
              <div className="space-y-3">
                {pipeline.runs?.map((run) => (
                  <Link
                    key={run.id}
                    href={`/pipelines/${pipelineId}/runs/${run.id}`}
                    className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-sm">
                        {formatDate(run.startedAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
