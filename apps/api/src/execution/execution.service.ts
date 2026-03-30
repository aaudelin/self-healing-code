import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RunStatus, StepStatus, Integration } from '@aiops/database';
import {
  LogEntry,
  RepositoryContext,
  DatabaseSchema,
  AnalysisReport,
  RemediationResult,
} from '@aiops/shared';

import { RunsService } from '../runs/runs.service';

import { AnalysisStep } from './steps/analysis.step';
import { LogIngestionStep } from './steps/log-ingestion.step';
import { RemediationStep } from './steps/remediation.step';
import { RepositoryCloneStep } from './steps/repository-clone.step';
import { SchemaInspectionStep } from './steps/schema-inspection.step';
import { TicketUpdateStep } from './steps/ticket-update.step';

export interface ExecutionContext {
  runId: string;
  pipelineId: string;
  integrations: Map<string, Integration>;
  logs?: LogEntry[];
  repository?: RepositoryContext;
  schema?: DatabaseSchema;
  analysis?: AnalysisReport;
  remediation?: RemediationResult;
  ticketId?: string;
  ticketUrl?: string;
}

@Injectable()
export class ExecutionService {
  constructor(
    @Inject(forwardRef(() => RunsService))
    private readonly runsService: RunsService,
    private readonly logIngestionStep: LogIngestionStep,
    private readonly repositoryCloneStep: RepositoryCloneStep,
    private readonly schemaInspectionStep: SchemaInspectionStep,
    private readonly analysisStep: AnalysisStep,
    private readonly remediationStep: RemediationStep,
    private readonly ticketUpdateStep: TicketUpdateStep,
  ) {}

  async execute(runId: string): Promise<void> {
    const run = await this.runsService.getById(runId);
    if (!run) {
      throw new Error('Run not found');
    }

    const pipeline = (run as { pipeline?: { integrations?: Integration[] } })
      .pipeline;
    if (!pipeline?.integrations) {
      throw new Error('Pipeline integrations not found');
    }

    const integrations = new Map<string, Integration>();
    for (const integration of pipeline.integrations) {
      integrations.set(integration.role, integration);
    }

    const context: ExecutionContext = {
      runId,
      pipelineId: run.pipelineId,
      integrations,
    };

    await this.runsService.updateRunStatus(runId, RunStatus.RUNNING);

    try {
      // Step 0: Log Ingestion
      const logsResult = await this.executeStep(context, 0, async () => {
        return this.logIngestionStep.execute(context);
      });

      if (!logsResult.success) {
        await this.handleStepFailure(context, 0, logsResult.error);
        return;
      }
      context.logs = logsResult.data;

      // Check if there are any errors to process
      if (!context.logs || context.logs.length === 0) {
        await this.runsService.updateStepStatus(runId, 0, StepStatus.SUCCESS, {
          message: 'No errors found in logs',
        });
        await this.runsService.skipRemainingSteps(runId, 0);
        await this.runsService.updateRunStatus(runId, RunStatus.NO_ERRORS);
        return;
      }

      // Step 1: Repository Clone
      const repoResult = await this.executeStep(context, 1, async () => {
        return this.repositoryCloneStep.execute(context);
      });

      if (!repoResult.success) {
        await this.handleStepFailure(context, 1, repoResult.error);
        return;
      }
      context.repository = repoResult.data;

      // Step 2: Schema Inspection
      const schemaResult = await this.executeStep(context, 2, async () => {
        return this.schemaInspectionStep.execute(context);
      });

      if (!schemaResult.success) {
        await this.handleStepFailure(context, 2, schemaResult.error);
        return;
      }
      context.schema = schemaResult.data;

      // Step 3: Analysis
      const analysisResult = await this.executeStep(context, 3, async () => {
        return this.analysisStep.execute(context);
      });

      if (!analysisResult.success) {
        await this.handleStepFailure(context, 3, analysisResult.error);
        return;
      }
      context.analysis = analysisResult.data;
      context.ticketId = analysisResult.extra?.ticketId;
      context.ticketUrl = analysisResult.extra?.ticketUrl;

      // Step 4: Remediation
      const remediationResult = await this.executeStep(context, 4, async () => {
        return this.remediationStep.execute(context);
      });

      if (!remediationResult.success) {
        await this.handleStepFailure(context, 4, remediationResult.error, true);
        return;
      }
      context.remediation = remediationResult.data;

      // Step 5: Ticket Update
      const ticketResult = await this.executeStep(context, 5, async () => {
        return this.ticketUpdateStep.execute(context);
      });

      if (!ticketResult.success) {
        await this.runsService.updateStepStatus(
          runId,
          5,
          StepStatus.FAILED,
          undefined,
          ticketResult.error,
        );
        await this.runsService.updateRunStatus(runId, RunStatus.PARTIALLY_FAILED);
        return;
      }

      await this.runsService.updateRunStatus(runId, RunStatus.SUCCESS);
    } catch (error) {
      console.error('Pipeline execution error:', error);
      await this.runsService.updateRunStatus(runId, RunStatus.FAILED);
    }
  }

  private async executeStep<T>(
    context: ExecutionContext,
    stepOrder: number,
    stepFn: () => Promise<{
      success: boolean;
      data?: T;
      error?: string;
      extra?: Record<string, unknown>;
    }>,
  ): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    extra?: Record<string, unknown>;
  }> {
    await this.runsService.updateStepStatus(
      context.runId,
      stepOrder,
      StepStatus.RUNNING,
    );

    const result = await stepFn();

    if (result.success) {
      await this.runsService.updateStepStatus(
        context.runId,
        stepOrder,
        StepStatus.SUCCESS,
        result.data as Record<string, unknown>,
      );
    }

    return result;
  }

  private async handleStepFailure(
    context: ExecutionContext,
    stepOrder: number,
    error?: string,
    partialSuccess = false,
  ): Promise<void> {
    await this.runsService.updateStepStatus(
      context.runId,
      stepOrder,
      StepStatus.FAILED,
      undefined,
      error,
    );
    await this.runsService.skipRemainingSteps(context.runId, stepOrder);
    await this.runsService.updateRunStatus(
      context.runId,
      partialSuccess ? RunStatus.PARTIALLY_FAILED : RunStatus.FAILED,
    );
  }
}
