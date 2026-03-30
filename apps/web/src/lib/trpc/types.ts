import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

// This type will be inferred from the API
// For now, we define it manually to match the backend
export type AppRouter = {
  pipeline: {
    list: {
      query: () => Promise<Pipeline[]>;
    };
    getById: {
      query: (input: { id: string }) => Promise<PipelineWithRelations>;
    };
    create: {
      mutate: (input: { name: string; description?: string }) => Promise<Pipeline>;
    };
    update: {
      mutate: (input: {
        id: string;
        data: { name?: string; description?: string | null };
      }) => Promise<Pipeline>;
    };
    delete: {
      mutate: (input: { id: string }) => Promise<Pipeline>;
    };
  };
  integration: {
    getByPipeline: {
      query: (input: { pipelineId: string }) => Promise<Integration[]>;
    };
    configure: {
      mutate: (input: {
        pipelineId: string;
        role: IntegrationRole;
        provider: string;
        config: Record<string, unknown>;
      }) => Promise<Integration>;
    };
    test: {
      mutate: (input: {
        pipelineId: string;
        role: IntegrationRole;
      }) => Promise<{ success: boolean; message: string }>;
    };
    delete: {
      mutate: (input: {
        pipelineId: string;
        role: IntegrationRole;
      }) => Promise<{ success: boolean }>;
    };
  };
  run: {
    listByPipeline: {
      query: (input: { pipelineId: string }) => Promise<PipelineRun[]>;
    };
    getById: {
      query: (input: { runId: string }) => Promise<PipelineRunWithSteps>;
    };
    trigger: {
      mutate: (input: { pipelineId: string }) => Promise<PipelineRun>;
    };
  };
};

export type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'CONFIGURED';
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationRole = 'LOGS' | 'REPOSITORY' | 'DATABASE' | 'TICKETING';

export type PipelineRun = {
  id: string;
  pipelineId: string;
  status: RunStatus;
  startedAt: Date;
  endedAt: Date | null;
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
  startedAt: Date | null;
  endedAt: Date | null;
  output: Record<string, unknown> | null;
  error: string | null;
};

export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
