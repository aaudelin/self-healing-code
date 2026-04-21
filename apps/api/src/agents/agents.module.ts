import { Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module';

import { AnalysisAgentRemoteService } from './analysis-agent-remote.service';
import { AnalysisAgentService } from './analysis-agent.service';
import { RemediationAgentService } from './remediation-agent.service';

@Module({
  imports: [ProvidersModule],
  providers: [
    AnalysisAgentService,
    AnalysisAgentRemoteService,
    RemediationAgentService,
  ],
  exports: [
    AnalysisAgentService,
    AnalysisAgentRemoteService,
    RemediationAgentService,
  ],
})
export class AgentsModule {}
