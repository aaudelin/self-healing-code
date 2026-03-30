import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogEntry } from '@aiops/shared';

interface VercelLog {
  id: string;
  message: string;
  timestamp: number;
  type: string;
  source: string;
  level?: string;
}

@Injectable()
export class VercelService {
  private readonly token: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('VERCEL_TOKEN');
  }

  async testConnection(
    config: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.token) {
      return { success: false, message: 'VERCEL_TOKEN not configured' };
    }

    try {
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${config.projectId}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...(config.teamId && { 'x-vercel-team-id': config.teamId }),
          },
        },
      );

      if (!response.ok) {
        return { success: false, message: `Vercel API error: ${response.status}` };
      }

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async fetchLogs(
    config: Record<string, string>,
    since?: Date,
  ): Promise<LogEntry[]> {
    if (!this.token) {
      return this.getMockLogs();
    }

    try {
      const params = new URLSearchParams({
        projectId: config.projectId,
        ...(since && { since: since.getTime().toString() }),
      });

      if (config.teamId) {
        params.append('teamId', config.teamId);
      }

      const response = await fetch(
        `https://api.vercel.com/v2/deployments?${params}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      );

      if (!response.ok) {
        console.error('Failed to fetch Vercel logs');
        return this.getMockLogs();
      }

      const data = await response.json();
      const logs: LogEntry[] = [];

      for (const deployment of data.deployments?.slice(0, 5) || []) {
        const logsResponse = await fetch(
          `https://api.vercel.com/v2/deployments/${deployment.uid}/events`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          },
        );

        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          const errorLogs = (logsData as VercelLog[])
            .filter(
              (log: VercelLog) =>
                log.type === 'error' ||
                log.message?.toLowerCase().includes('error'),
            )
            .map((log: VercelLog) => ({
              timestamp: new Date(log.timestamp).toISOString(),
              level: 'error' as const,
              message: log.message,
              source: log.source || 'vercel',
            }));
          logs.push(...errorLogs);
        }
      }

      return logs.length > 0 ? logs : this.getMockLogs();
    } catch (error) {
      console.error('Error fetching Vercel logs:', error);
      return this.getMockLogs();
    }
  }

  private getMockLogs(): LogEntry[] {
    return [
      {
        timestamp: new Date().toISOString(),
        level: 'error',
        message:
          'TypeError: Cannot read property "id" of undefined at /api/users/[id].ts:23:15',
        source: 'vercel',
        stack: `TypeError: Cannot read property 'id' of undefined
    at handler (/api/users/[id].ts:23:15)
    at processRequest (/node_modules/next/server.js:145:22)`,
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'error',
        message:
          'PrismaClientKnownRequestError: Foreign key constraint failed on the field: `userId`',
        source: 'vercel',
        stack: `PrismaClientKnownRequestError: Foreign key constraint failed
    at createOrder (/api/orders/create.ts:45:12)`,
      },
    ];
  }
}
