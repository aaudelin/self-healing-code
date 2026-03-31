import { TriggerRunSchema } from '@aiops/shared';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { z } from 'zod';

import { ExecutionService } from '../execution/execution.service';
import { t } from '../trpc/trpc.service';

import { RunsService } from './runs.service';

@Injectable()
export class RunsRouter {
  constructor(
    private readonly runsService: RunsService,
    @Inject(forwardRef(() => ExecutionService))
    private readonly executionService: ExecutionService,
  ) {}

  get router() {
    return t.router({
      listByPipeline: t.procedure
        .input(z.object({ pipelineId: z.string().cuid() }))
        .query(async ({ input }) => {
          return this.runsService.listByPipeline(input.pipelineId);
        }),

      getById: t.procedure
        .input(z.object({ runId: z.string().cuid() }))
        .query(async ({ input }) => {
          const run = await this.runsService.getById(input.runId);
          if (!run) {
            throw new Error('Run not found');
          }
          return run;
        }),

      trigger: t.procedure.input(TriggerRunSchema).mutation(async ({ input }) => {
        const run = await this.runsService.create(input.pipelineId);

        // Start execution asynchronously
        this.executionService.execute(run.id).catch((error) => {
          console.error('Pipeline execution failed:', error);
        });

        return run;
      }),
    });
  }
}
