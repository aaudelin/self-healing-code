'use client';

import { PROVIDER_OPTIONS, INTEGRATION_ROLE_LABELS } from '@aiops/shared';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/trpc/client';
import type { Integration, IntegrationRole } from '@/lib/trpc/types';

interface IntegrationFormProps {
  pipelineId: string;
  role: IntegrationRole;
  integration?: Integration;
  onSuccess: () => void;
}

const configFields: Record<string, { label: string; placeholder: string }[]> = {
  vercel: [
    { label: 'Project ID', placeholder: 'prj_...' },
    { label: 'Team ID (optional)', placeholder: 'team_...' },
  ],
  github: [
    { label: 'Owner', placeholder: 'username or org' },
    { label: 'Repository', placeholder: 'repo-name' },
    { label: 'Branch', placeholder: 'main' },
  ],
  supabase: [{ label: 'Project Reference', placeholder: 'abcdefghijklmnop' }],
  linear: [
    { label: 'Team ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { label: 'Project ID (optional)', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
  ],
};

const configKeys: Record<string, string[]> = {
  vercel: ['projectId', 'teamId'],
  github: ['owner', 'repo', 'branch'],
  supabase: ['projectRef'],
  linear: ['teamId', 'projectId'],
};

export function IntegrationForm({
  pipelineId,
  role,
  integration,
  onSuccess,
}: IntegrationFormProps) {
  const [provider, setProvider] = useState(integration?.provider || '');
  const [config, setConfig] = useState<Record<string, string>>(
    (integration?.config as Record<string, string>) || {},
  );
  const { toast } = useToast();

  const configureMutation = trpc.integration.configure.useMutation({
    onSuccess: () => {
      toast({ title: 'Integration configured successfully' });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const testMutation = trpc.integration.test.useMutation({
    onSuccess: (result) => {
      toast({
        title: result.success ? 'Connection successful' : 'Connection failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configureMutation.mutate({
      pipelineId,
      role,
      provider,
      config,
    });
  };

  const handleTest = () => {
    testMutation.mutate({ pipelineId, role });
  };

  const providers = PROVIDER_OPTIONS[role] || [];
  const fields = provider ? configFields[provider] || [] : [];
  const keys = provider ? configKeys[provider] || [] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{INTEGRATION_ROLE_LABELS[role]}</Label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger>
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {provider &&
        fields.map((field, index) => (
          <div key={keys[index]} className="space-y-2">
            <Label>{field.label}</Label>
            <Input
              placeholder={field.placeholder}
              value={config[keys[index]] || ''}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, [keys[index]]: e.target.value }))
              }
            />
          </div>
        ))}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!provider || configureMutation.isPending}
        >
          {configureMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save
        </Button>
        {integration && (
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Test Connection
          </Button>
        )}
      </div>
    </form>
  );
}
