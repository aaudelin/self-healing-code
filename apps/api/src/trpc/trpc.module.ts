import { Module } from '@nestjs/common';

import { IntegrationsModule } from '../integrations/integrations.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { RunsModule } from '../runs/runs.module';

import { TrpcController } from './trpc.controller';
import { TrpcService } from './trpc.service';

@Module({
  imports: [PipelinesModule, IntegrationsModule, RunsModule],
  controllers: [TrpcController],
  providers: [TrpcService],
  exports: [TrpcService],
})
export class TrpcModule {}
