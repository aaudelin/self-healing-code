import { Module, forwardRef } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { ProvidersModule } from '../providers/providers.module';
import { RunsModule } from '../runs/runs.module';

import { ExecutionService } from './execution.service';
import { AnalysisStep } from './steps/analysis.step';
import { LogIngestionStep } from './steps/log-ingestion.step';
import { RemediationStep } from './steps/remediation.step';
import { RepositoryCloneStep } from './steps/repository-clone.step';
import { SchemaInspectionStep } from './steps/schema-inspection.step';
import { TicketUpdateStep } from './steps/ticket-update.step';

@Module({
  imports: [forwardRef(() => RunsModule), ProvidersModule, AgentsModule],
  providers: [
    ExecutionService,
    LogIngestionStep,
    RepositoryCloneStep,
    SchemaInspectionStep,
    AnalysisStep,
    RemediationStep,
    TicketUpdateStep,
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}
