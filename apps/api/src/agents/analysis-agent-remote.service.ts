import {
  AnalysisReport,
  DatabaseSchema,
  LogEntry,
  RepositoryContext,
} from '@aiops/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalysisAgentRemoteService {
  private readonly logger = new Logger(AnalysisAgentRemoteService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('AGENTS_SERVICE_URL') ??
      'http://localhost:4100';
  }

  async analyze(
    logs: LogEntry[],
    repository: RepositoryContext,
    schema: DatabaseSchema,
  ): Promise<AnalysisReport> {
    const url = `${this.baseUrl}/runs/analyze`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ logs, repository, schema }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Agents service /runs/analyze failed (${response.status}): ${body}`,
      );
      throw new Error(
        `Agents service returned ${response.status}: ${body.slice(0, 200)}`,
      );
    }

    return (await response.json()) as AnalysisReport;
  }
}
