import { Injectable } from '@nestjs/common';
import { RepositoryContext } from '@aiops/shared';

import { GitHubService } from '../../providers/github.service';
import { ExecutionContext } from '../execution.service';

@Injectable()
export class RepositoryCloneStep {
  constructor(private readonly githubService: GitHubService) {}

  async execute(context: ExecutionContext): Promise<{
    success: boolean;
    data?: RepositoryContext;
    error?: string;
  }> {
    const integration = context.integrations.get('REPOSITORY');
    if (!integration) {
      return { success: false, error: 'Repository integration not configured' };
    }

    try {
      const repository = await this.githubService.fetchRepository(
        integration.config as Record<string, string>,
      );

      return {
        success: true,
        data: repository,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch repository',
      };
    }
  }
}
