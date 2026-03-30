import { Module } from '@nestjs/common';

import { GitHubService } from './github.service';
import { LinearService } from './linear.service';
import { SupabaseIntegrationService } from './supabase-integration.service';
import { VercelService } from './vercel.service';

@Module({
  providers: [
    VercelService,
    GitHubService,
    SupabaseIntegrationService,
    LinearService,
  ],
  exports: [
    VercelService,
    GitHubService,
    SupabaseIntegrationService,
    LinearService,
  ],
})
export class ProvidersModule {}
