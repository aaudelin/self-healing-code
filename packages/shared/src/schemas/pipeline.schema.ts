import { z } from 'zod';

export const PipelineStatusSchema = z.enum(['DRAFT', 'CONFIGURED']);

export const CreatePipelineSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

export const UpdatePipelineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  status: PipelineStatusSchema.optional(),
});

export const PipelineSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: PipelineStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreatePipelineInput = z.infer<typeof CreatePipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;
