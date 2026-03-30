import { Injectable } from '@nestjs/common';
import { DatabaseSchema } from '@aiops/shared';

import { SupabaseIntegrationService } from '../../providers/supabase-integration.service';
import { ExecutionContext } from '../execution.service';

@Injectable()
export class SchemaInspectionStep {
  constructor(
    private readonly supabaseService: SupabaseIntegrationService,
  ) {}

  async execute(context: ExecutionContext): Promise<{
    success: boolean;
    data?: DatabaseSchema;
    error?: string;
  }> {
    const integration = context.integrations.get('DATABASE');
    if (!integration) {
      return { success: false, error: 'Database integration not configured' };
    }

    try {
      const schema = await this.supabaseService.fetchSchema(
        integration.config as Record<string, string>,
      );

      return {
        success: true,
        data: schema,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch schema',
      };
    }
  }
}
