import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AgentsModule } from './agents/agents.module';
import { ExecutionModule } from './execution/execution.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { RunsModule } from './runs/runs.module';
import { TrpcModule } from './trpc/trpc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    TrpcModule,
    PipelinesModule,
    IntegrationsModule,
    RunsModule,
    ProvidersModule,
    AgentsModule,
    ExecutionModule,
  ],
})
export class AppModule {}
