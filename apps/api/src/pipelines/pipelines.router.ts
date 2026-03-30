import { Injectable } from '@nestjs/common';
import { CreatePipelineSchema, UpdatePipelineSchema } from '@aiops/shared';
import { z } from 'zod';

import { t } from '../trpc/trpc.service';

import { PipelinesService } from './pipelines.service';

@Injectable()
export class PipelinesRouter {
  constructor(private readonly pipelinesService: PipelinesService) {}

  get router() {
    return t.router({
      list: t.procedure.query(async () => {
        return this.pipelinesService.list();
      }),

      getById: t.procedure
        .input(z.object({ id: z.string().cuid() }))
        .query(async ({ input }) => {
          const pipeline = await this.pipelinesService.getById(input.id);
          if (!pipeline) {
            throw new Error('Pipeline not found');
          }
          return pipeline;
        }),

      create: t.procedure
        .input(CreatePipelineSchema)
        .mutation(async ({ input }) => {
          return this.pipelinesService.create(input);
        }),

      update: t.procedure
        .input(
          z.object({
            id: z.string().cuid(),
            data: UpdatePipelineSchema,
          }),
        )
        .mutation(async ({ input }) => {
          return this.pipelinesService.update(input.id, input.data);
        }),

      delete: t.procedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(async ({ input }) => {
          return this.pipelinesService.delete(input.id);
        }),
    });
  }
}
