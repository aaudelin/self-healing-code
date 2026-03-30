import { Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module';

import { AnalysisAgentService } from './analysis-agent.service';
import { RemediationAgentService } from './remediation-agent.service';

@Module({
  imports: [ProvidersModule],
  providers: [AnalysisAgentService, RemediationAgentService],
  exports: [AnalysisAgentService, RemediationAgentService],
})
export class AgentsModule {}
