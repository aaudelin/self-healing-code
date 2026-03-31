import { Pipeline, PipelineStatus } from '@aiops/database';
import { CreatePipelineInput, UpdatePipelineInput } from '@aiops/shared';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Pipeline[]> {
    return this.prisma.pipeline.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        integrations: true,
        runs: {
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
  }

  async getById(id: string): Promise<Pipeline | null> {
    return this.prisma.pipeline.findUnique({
      where: { id },
      include: {
        integrations: true,
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async create(data: CreatePipelineInput): Promise<Pipeline> {
    return this.prisma.pipeline.create({
      data: {
        name: data.name,
        description: data.description,
        status: PipelineStatus.DRAFT,
      },
    });
  }

  async update(id: string, data: UpdatePipelineInput): Promise<Pipeline> {
    return this.prisma.pipeline.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  async delete(id: string): Promise<Pipeline> {
    return this.prisma.pipeline.delete({
      where: { id },
    });
  }

  async updateStatus(id: string): Promise<Pipeline> {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id },
      include: { integrations: true },
    });

    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const hasAllIntegrations = pipeline.integrations.length === 4;
    const newStatus = hasAllIntegrations
      ? PipelineStatus.CONFIGURED
      : PipelineStatus.DRAFT;

    if (pipeline.status !== newStatus) {
      return this.prisma.pipeline.update({
        where: { id },
        data: { status: newStatus },
      });
    }

    return pipeline;
  }
}
