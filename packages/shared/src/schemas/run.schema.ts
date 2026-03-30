import { z } from 'zod';

export const RunStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'PARTIALLY_FAILED',
  'NO_ERRORS',
]);

export const StepStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'SKIPPED',
]);

export const StepNameSchema = z.enum([
  'LOG_INGESTION',
  'REPOSITORY_CLONE',
  'SCHEMA_INSPECTION',
  'ANALYSIS',
  'REMEDIATION',
  'TICKET_UPDATE',
]);

export const TriggerRunSchema = z.object({
  pipelineId: z.string().cuid(),
});

export const RunStepSchema = z.object({
  id: z.string().cuid(),
  runId: z.string().cuid(),
  name: z.string(),
  order: z.number().int().min(0),
  status: StepStatusSchema,
  startedAt: z.date().nullable(),
  endedAt: z.date().nullable(),
  output: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
});

export const PipelineRunSchema = z.object({
  id: z.string().cuid(),
  pipelineId: z.string().cuid(),
  status: RunStatusSchema,
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  steps: z.array(RunStepSchema),
});

export type RunStatus = z.infer<typeof RunStatusSchema>;
export type StepStatus = z.infer<typeof StepStatusSchema>;
export type StepName = z.infer<typeof StepNameSchema>;
export type TriggerRunInput = z.infer<typeof TriggerRunSchema>;
export type RunStep = z.infer<typeof RunStepSchema>;
export type PipelineRun = z.infer<typeof PipelineRunSchema>;
