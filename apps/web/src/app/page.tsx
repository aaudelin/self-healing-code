'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { PipelineCard } from '@/components/pipeline-card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/trpc/client';

export default function DashboardPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: pipelines, isLoading } = trpc.pipeline.list.useQuery();

  const deleteMutation = trpc.pipeline.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Pipeline deleted' });
      utils.pipeline.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const triggerMutation = trpc.run.trigger.useMutation({
    onSuccess: (run) => {
      toast({ title: 'Pipeline run started' });
      utils.pipeline.list.invalidate();
      setTriggeringId(null);
      window.location.href = `/pipelines/${run.pipelineId}/runs/${run.id}`;
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setTriggeringId(null);
    },
  });

  const handleTrigger = (id: string) => {
    setTriggeringId(id);
    triggerMutation.mutate({ pipelineId: id });
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading pipelines...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pipelines</h1>
        <Button asChild>
          <Link href="/pipelines/new">
            <Plus className="mr-2 h-4 w-4" />
            New Pipeline
          </Link>
        </Button>
      </div>

      {pipelines?.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No pipelines yet</h3>
          <p className="text-muted-foreground mt-1">
            Create your first pipeline to get started
          </p>
          <Button className="mt-4" asChild>
            <Link href="/pipelines/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Pipeline
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pipelines?.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onTrigger={handleTrigger}
              onDelete={handleDelete}
              isTriggering={triggeringId === pipeline.id}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Pipeline"
        description="Are you sure you want to delete this pipeline? This action cannot be undone and will remove all associated runs and integrations."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
