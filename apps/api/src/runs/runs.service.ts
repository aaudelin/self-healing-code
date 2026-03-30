import { Injectable } from '@nestjs/common';
import { PipelineRun, RunStatus, StepStatus } from '@aiops/database';
import { STEP_ORDER, STEP_NAMES } from '@aiops/shared';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByPipeline(pipelineId: string): Promise<PipelineRun[]> {
    return this.prisma.pipelineRun.findMany({
      where: { pipelineId },
      orderBy: { startedAt: 'desc' },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async getById(runId: string): Promise<PipelineRun | null> {
    return this.prisma.pipelineRun.findUnique({
      where: { id: runId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        pipeline: {
          include: {
            integrations: true,
          },
        },
      },
    });
  }

  async create(pipelineId: string): Promise<PipelineRun> {
    return this.prisma.pipelineRun.create({
      data: {
        pipelineId,
        status: RunStatus.PENDING,
        steps: {
          create: STEP_ORDER.map((stepName, index) => ({
            name: STEP_NAMES[stepName],
            order: index,
            status: StepStatus.PENDING,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateRunStatus(runId: string, status: RunStatus): Promise<PipelineRun> {
    return this.prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status,
        ...(status !== RunStatus.RUNNING && status !== RunStatus.PENDING
          ? { endedAt: new Date() }
          : {}),
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateStepStatus(
    runId: string,
    stepOrder: number,
    status: StepStatus,
    output?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const step = await this.prisma.runStep.findFirst({
      where: { runId, order: stepOrder },
    });

    if (!step) {
      throw new Error(`Step with order ${stepOrder} not found`);
    }

    await this.prisma.runStep.update({
      where: { id: step.id },
      data: {
        status,
        ...(status === StepStatus.RUNNING ? { startedAt: new Date() } : {}),
        ...(status === StepStatus.SUCCESS ||
        status === StepStatus.FAILED ||
        status === StepStatus.SKIPPED
          ? { endedAt: new Date() }
          : {}),
        ...(output ? { output } : {}),
        ...(error ? { error } : {}),
      },
    });
  }

  async skipRemainingSteps(runId: string, fromOrder: number): Promise<void> {
    await this.prisma.runStep.updateMany({
      where: {
        runId,
        order: { gt: fromOrder },
        status: StepStatus.PENDING,
      },
      data: {
        status: StepStatus.SKIPPED,
      },
    });
  }
}
