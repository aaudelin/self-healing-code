import { Module, forwardRef } from '@nestjs/common';

import { PipelinesModule } from '../pipelines/pipelines.module';
import { ProvidersModule } from '../providers/providers.module';

import { IntegrationsRouter } from './integrations.router';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [forwardRef(() => PipelinesModule), ProvidersModule],
  providers: [IntegrationsService, IntegrationsRouter],
  exports: [IntegrationsService, IntegrationsRouter],
})
export class IntegrationsModule {}
