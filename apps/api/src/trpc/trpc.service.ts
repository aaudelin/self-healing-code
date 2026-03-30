import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';

import { IntegrationsRouter } from '../integrations/integrations.router';
import { PipelinesRouter } from '../pipelines/pipelines.router';
import { RunsRouter } from '../runs/runs.router';

export const t = initTRPC.create();

@Injectable()
export class TrpcService {
  constructor(
    private readonly pipelinesRouter: PipelinesRouter,
    private readonly integrationsRouter: IntegrationsRouter,
    private readonly runsRouter: RunsRouter,
  ) {}

  get appRouter() {
    return t.router({
      pipeline: this.pipelinesRouter.router,
      integration: this.integrationsRouter.router,
      run: this.runsRouter.router,
    });
  }
}

export type AppRouter = ReturnType<TrpcService['appRouter']>;
