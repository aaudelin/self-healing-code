import { LogEntry } from '@aiops/shared';
import { Injectable } from '@nestjs/common';

import { VercelService } from '../../providers/vercel.service';
import { ExecutionContext } from '../execution.service';

@Injectable()
export class LogIngestionStep {
  constructor(private readonly vercelService: VercelService) {}

  async execute(context: ExecutionContext): Promise<{
    success: boolean;
    data?: LogEntry[];
    error?: string;
  }> {
    const integration = context.integrations.get('LOGS');
    if (!integration) {
      return { success: false, error: 'Logs integration not configured' };
    }

    try {
      const logs = await this.vercelService.fetchLogs(
        integration.config as Record<string, string>,
      );

      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch logs',
      };
    }
  }
}
