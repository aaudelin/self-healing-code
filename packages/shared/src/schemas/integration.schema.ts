import { z } from 'zod';

export const IntegrationRoleSchema = z.enum([
  'LOGS',
  'REPOSITORY',
  'DATABASE',
  'TICKETING',
]);

export const VercelConfigSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  teamId: z.string().optional(),
});

export const GitHubConfigSchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  repo: z.string().min(1, 'Repository is required'),
  branch: z.string().default('main'),
});

export const SupabaseConfigSchema = z.object({
  projectRef: z.string().min(1, 'Project reference is required'),
});

export const LinearConfigSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  projectId: z.string().optional(),
});

export const IntegrationConfigSchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('vercel'), ...VercelConfigSchema.shape }),
  z.object({ provider: z.literal('github'), ...GitHubConfigSchema.shape }),
  z.object({ provider: z.literal('supabase'), ...SupabaseConfigSchema.shape }),
  z.object({ provider: z.literal('linear'), ...LinearConfigSchema.shape }),
]);

export const ConfigureIntegrationSchema = z.object({
  pipelineId: z.string().cuid(),
  role: IntegrationRoleSchema,
  provider: z.string().min(1),
  config: z.record(z.unknown()),
});

export const IntegrationSchema = z.object({
  id: z.string().cuid(),
  pipelineId: z.string().cuid(),
  role: IntegrationRoleSchema,
  provider: z.string(),
  config: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IntegrationRole = z.infer<typeof IntegrationRoleSchema>;
export type ConfigureIntegrationInput = z.infer<
  typeof ConfigureIntegrationSchema
>;
export type Integration = z.infer<typeof IntegrationSchema>;
