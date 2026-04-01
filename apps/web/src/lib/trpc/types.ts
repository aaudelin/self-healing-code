import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// Initialize tRPC for type inference
const t = initTRPC.create();

// Define the router structure to match the backend
const pipelineRouter = t.router({
  list: t.procedure.query(() => null as unknown as Pipeline[]),
  getById: t.procedure
    .input(z.object({ id: z.string() }))
    .query(() => null as unknown as PipelineWithRelations),
  create: t.procedure
    .input(z.object({ name: z.string(), description: z.string().optional() }))
    .mutation(() => null as unknown as Pipeline),
  update: t.procedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          description: z.string().nullable().optional(),
        }),
      }),
    )
    .mutation(() => null as unknown as Pipeline),
  delete: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(() => null as unknown as Pipeline),
});

const integrationRouter = t.router({
  getByPipeline: t.procedure
    .input(z.object({ pipelineId: z.string() }))
    .query(() => null as unknown as Integration[]),
  configure: t.procedure
    .input(
      z.object({
        pipelineId: z.string(),
        role: z.enum(['LOGS', 'REPOSITORY', 'DATABASE', 'TICKETING']),
        provider: z.string(),
        config: z.record(z.unknown()),
      }),
    )
    .mutation(() => null as unknown as Integration),
  test: t.procedure
    .input(
      z.object({
        pipelineId: z.string(),
        role: z.enum(['LOGS', 'REPOSITORY', 'DATABASE', 'TICKETING']),
      }),
    )
    .mutation(() => null as unknown as { success: boolean; message: string }),
  delete: t.procedure
    .input(
      z.object({
        pipelineId: z.string(),
        role: z.enum(['LOGS', 'REPOSITORY', 'DATABASE', 'TICKETING']),
      }),
    )
    .mutation(() => null as unknown as { success: boolean }),
});

const runRouter = t.router({
  listByPipeline: t.procedure
    .input(z.object({ pipelineId: z.string() }))
    .query(() => null as unknown as PipelineRun[]),
  getById: t.procedure
    .input(z.object({ runId: z.string() }))
    .query(() => null as unknown as PipelineRunWithSteps),
  trigger: t.procedure
    .input(z.object({ pipelineId: z.string() }))
    .mutation(() => null as unknown as PipelineRun),
});

// Create the app router for type inference
const appRouter = t.router({
  pipeline: pipelineRouter,
  integration: integrationRouter,
  run: runRouter,
});

export type AppRouter = typeof appRouter;

// Entity types (using string for dates since JSON serializes them as strings)
export type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'CONFIGURED';
  createdAt: string;
  updatedAt: string;
};

export type PipelineWithRelations = Pipeline & {
  integrations: Integration[];
  runs: PipelineRun[];
};

export type Integration = {
  id: string;
  pipelineId: string;
  role: IntegrationRole;
  provider: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationRole = 'LOGS' | 'REPOSITORY' | 'DATABASE' | 'TICKETING';

export type PipelineRun = {
  id: string;
  pipelineId: string;
  status: RunStatus;
  startedAt: string;
  endedAt: string | null;
  ticketUrl: string | null;
  pullRequestUrl: string | null;
  steps?: RunStep[];
};

export type PipelineRunWithSteps = PipelineRun & {
  steps: RunStep[];
};

export type RunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PARTIALLY_FAILED'
  | 'NO_ERRORS';

export type RunStep = {
  id: string;
  runId: string;
  name: string;
  order: number;
  status: StepStatus;
  startedAt: string | null;
  endedAt: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
};

export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
