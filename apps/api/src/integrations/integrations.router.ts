import { IntegrationRole } from '@aiops/database';
import { ConfigureIntegrationSchema, IntegrationRoleSchema } from '@aiops/shared';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { t } from '../trpc/trpc.service';

import { IntegrationsService } from './integrations.service';

@Injectable()
export class IntegrationsRouter {
  constructor(private readonly integrationsService: IntegrationsService) {}

  get router() {
    return t.router({
      getByPipeline: t.procedure
        .input(z.object({ pipelineId: z.string().cuid() }))
        .query(async ({ input }) => {
          return this.integrationsService.getByPipeline(input.pipelineId);
        }),

      configure: t.procedure
        .input(ConfigureIntegrationSchema)
        .mutation(async ({ input }) => {
          return this.integrationsService.configure(input);
        }),

      test: t.procedure
        .input(
          z.object({
            pipelineId: z.string().cuid(),
            role: IntegrationRoleSchema,
          }),
        )
        .mutation(async ({ input }) => {
          return this.integrationsService.testConnection(
            input.pipelineId,
            input.role as IntegrationRole,
          );
        }),

      delete: t.procedure
        .input(
          z.object({
            pipelineId: z.string().cuid(),
            role: IntegrationRoleSchema,
          }),
        )
        .mutation(async ({ input }) => {
          await this.integrationsService.delete(
            input.pipelineId,
            input.role as IntegrationRole,
          );
          return { success: true };
        }),
    });
  }
}
