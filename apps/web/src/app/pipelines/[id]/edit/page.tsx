'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { IntegrationForm } from '@/components/integration-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/trpc/client';
import type { IntegrationRole } from '@/lib/trpc/types';

export default function EditPipelinePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const pipelineId = params.id as string;

  const { data: pipeline, isLoading } = trpc.pipeline.getById.useQuery(
    { id: pipelineId },
    { enabled: !!pipelineId },
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const updateMutation = trpc.pipeline.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Pipeline updated' });
      utils.pipeline.getById.invalidate({ id: pipelineId });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: pipelineId,
      data: {
        name: name || undefined,
        description: description || undefined,
      },
    });
  };

  const handleIntegrationSuccess = () => {
    utils.pipeline.getById.invalidate({ id: pipelineId });
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
          <Link href={`/pipelines/${pipelineId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Configure Pipeline</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update pipeline name and description</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder={pipeline.name}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder={pipeline.description || 'Add a description...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Configure connections to your services. All 4 integrations are
              required to run the pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="LOGS">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="LOGS">Logs</TabsTrigger>
                <TabsTrigger value="REPOSITORY">Repo</TabsTrigger>
                <TabsTrigger value="DATABASE">DB</TabsTrigger>
                <TabsTrigger value="TICKETING">Tickets</TabsTrigger>
              </TabsList>
              {(['LOGS', 'REPOSITORY', 'DATABASE', 'TICKETING'] as IntegrationRole[]).map(
                (role) => (
                  <TabsContent key={role} value={role}>
                    <IntegrationForm
                      pipelineId={pipelineId}
                      role={role}
                      integration={integrationsByRole.get(role)}
                      onSuccess={handleIntegrationSuccess}
                    />
                  </TabsContent>
                ),
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => router.push(`/pipelines/${pipelineId}`)}>
          Done
        </Button>
      </div>
    </div>
  );
}
