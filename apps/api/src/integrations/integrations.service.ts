import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Integration, IntegrationRole, Prisma } from '@aiops/database';
import { ConfigureIntegrationInput } from '@aiops/shared';

import { PipelinesService } from '../pipelines/pipelines.service';
import { PrismaService } from '../prisma/prisma.service';
import { GitHubService } from '../providers/github.service';
import { LinearService } from '../providers/linear.service';
import { SupabaseIntegrationService } from '../providers/supabase-integration.service';
import { VercelService } from '../providers/vercel.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PipelinesService))
    private readonly pipelinesService: PipelinesService,
    private readonly vercelService: VercelService,
    private readonly githubService: GitHubService,
    private readonly supabaseService: SupabaseIntegrationService,
    private readonly linearService: LinearService,
  ) {}

  async getByPipeline(pipelineId: string): Promise<Integration[]> {
    return this.prisma.integration.findMany({
      where: { pipelineId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async configure(data: ConfigureIntegrationInput): Promise<Integration> {
    const integration = await this.prisma.integration.upsert({
      where: {
        pipelineId_role: {
          pipelineId: data.pipelineId,
          role: data.role as IntegrationRole,
        },
      },
      create: {
        pipelineId: data.pipelineId,
        role: data.role as IntegrationRole,
        provider: data.provider,
        config: data.config as Prisma.InputJsonValue,
      },
      update: {
        provider: data.provider,
        config: data.config as Prisma.InputJsonValue,
      },
    });

    await this.pipelinesService.updateStatus(data.pipelineId);

    return integration;
  }

  async testConnection(
    pipelineId: string,
    role: IntegrationRole,
  ): Promise<{ success: boolean; message: string }> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        pipelineId_role: {
          pipelineId,
          role,
        },
      },
    });

    if (!integration) {
      return { success: false, message: 'Integration not configured' };
    }

    try {
      switch (integration.provider) {
        case 'vercel':
          return this.vercelService.testConnection(
            integration.config as Record<string, string>,
          );
        case 'github':
          return this.githubService.testConnection(
            integration.config as Record<string, string>,
          );
        case 'supabase':
          return this.supabaseService.testConnection(
            integration.config as Record<string, string>,
          );
        case 'linear':
          return this.linearService.testConnection(
            integration.config as Record<string, string>,
          );
        default:
          return { success: false, message: 'Unknown provider' };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async delete(pipelineId: string, role: IntegrationRole): Promise<void> {
    await this.prisma.integration.delete({
      where: {
        pipelineId_role: {
          pipelineId,
          role,
        },
      },
    });

    await this.pipelinesService.updateStatus(pipelineId);
  }
}
