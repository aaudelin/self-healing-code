import { RunStatus, StepStatus, Integration } from '@aiops/database';
import {
  LogEntry,
  RepositoryContext,
  DatabaseSchema,
  AnalysisReport,
  RemediationResult,
  STEP_NAMES,
  StepName,
  STEP_ORDER,
} from '@aiops/shared';
import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';

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
  private readonly logger = new Logger(ExecutionService.name);

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

  private getStepName(stepOrder: number): string {
    const stepKey = STEP_ORDER[stepOrder] as StepName;
    return STEP_NAMES[stepKey] || `Step ${stepOrder}`;
  }

  async execute(runId: string): Promise<void> {
    this.logger.log(`[Run ${runId}] Starting pipeline execution`);

    const run = await this.runsService.getById(runId);
    if (!run) {
      this.logger.error(`[Run ${runId}] Run not found`);
      throw new Error('Run not found');
    }

    const pipeline = (run as { pipeline?: { integrations?: Integration[] } })
      .pipeline;
    if (!pipeline?.integrations) {
      this.logger.error(`[Run ${runId}] Pipeline integrations not found`);
      throw new Error('Pipeline integrations not found');
    }

    const integrations = new Map<string, Integration>();
    for (const integration of pipeline.integrations) {
      integrations.set(integration.role, integration);
      this.logger.debug(
        `[Run ${runId}] Found integration: ${integration.role} (${integration.provider})`,
      );
    }

    this.logger.log(
      `[Run ${runId}] Configured integrations: ${Array.from(integrations.keys()).join(', ')}`,
    );

    const context: ExecutionContext = {
      runId,
      pipelineId: run.pipelineId,
      integrations,
    };

    await this.runsService.updateRunStatus(runId, RunStatus.RUNNING);
    this.logger.log(`[Run ${runId}] Status updated to RUNNING`);

    try {
      // Step 0: Log Ingestion
      this.logger.log(`[Run ${runId}] Step 0: Starting Log Ingestion`);
      const logsResult = await this.executeStep(context, 0, async () => {
        return this.logIngestionStep.execute(context);
      });

      if (!logsResult.success) {
        this.logger.error(
          `[Run ${runId}] Step 0: Log Ingestion failed - ${logsResult.error}`,
        );
        await this.handleStepFailure(context, 0, logsResult.error);
        return;
      }
      context.logs = logsResult.data;
      this.logger.log(
        `[Run ${runId}] Step 0: Log Ingestion completed - Found ${context.logs?.length || 0} error logs`,
      );

      // Check if there are any errors to process
      if (!context.logs || context.logs.length === 0) {
        this.logger.log(`[Run ${runId}] No errors found in logs, skipping remaining steps`);
        await this.runsService.updateStepStatus(runId, 0, StepStatus.SUCCESS, {
          message: 'No errors found in logs',
        });
        await this.runsService.skipRemainingSteps(runId, 0);
        await this.runsService.updateRunStatus(runId, RunStatus.NO_ERRORS);
        return;
      }

      // Step 1: Repository Clone
      this.logger.log(`[Run ${runId}] Step 1: Starting Repository Clone`);
      const repoResult = await this.executeStep(context, 1, async () => {
        return this.repositoryCloneStep.execute(context);
      });

      if (!repoResult.success) {
        this.logger.error(
          `[Run ${runId}] Step 1: Repository Clone failed - ${repoResult.error}`,
        );
        await this.handleStepFailure(context, 1, repoResult.error);
        return;
      }
      context.repository = repoResult.data;
      this.logger.log(
        `[Run ${runId}] Step 1: Repository Clone completed - Found ${context.repository?.files?.length || 0} files`,
      );

      // Step 2: Schema Inspection
      this.logger.log(`[Run ${runId}] Step 2: Starting Schema Inspection`);
      const schemaResult = await this.executeStep(context, 2, async () => {
        return this.schemaInspectionStep.execute(context);
      });

      if (!schemaResult.success) {
        this.logger.error(
          `[Run ${runId}] Step 2: Schema Inspection failed - ${schemaResult.error}`,
        );
        await this.handleStepFailure(context, 2, schemaResult.error);
        return;
      }
      context.schema = schemaResult.data;
      this.logger.log(
        `[Run ${runId}] Step 2: Schema Inspection completed - Found ${context.schema?.tables?.length || 0} tables`,
      );

      // Step 3: Analysis
      this.logger.log(`[Run ${runId}] Step 3: Starting Analysis`);
      const analysisResult = await this.executeStep(context, 3, async () => {
        return this.analysisStep.execute(context);
      });

      if (!analysisResult.success) {
        this.logger.error(
          `[Run ${runId}] Step 3: Analysis failed - ${analysisResult.error}`,
        );
        await this.handleStepFailure(context, 3, analysisResult.error);
        return;
      }
      context.analysis = analysisResult.data;
      this.logger.log(
        `[Run ${runId}] Step 3: Analysis completed - Error type: ${context.analysis?.errorType}, Severity: ${context.analysis?.severity}, Confidence: ${context.analysis?.confidence}`,
      );

      context.ticketId = analysisResult.extra?.ticketId as string | undefined;
      context.ticketUrl = analysisResult.extra?.ticketUrl as string | undefined;

      if (context.ticketId && context.ticketUrl) {
        this.logger.log(
          `[Run ${runId}] Step 3: Linear ticket created - ID: ${context.ticketId}, URL: ${context.ticketUrl}`,
        );
      } else {
        this.logger.warn(
          `[Run ${runId}] Step 3: No Linear ticket created (ticketId: ${context.ticketId}, ticketUrl: ${context.ticketUrl})`,
        );
      }

      // Persist ticket URL to the run record
      if (context.ticketUrl) {
        await this.runsService.updateRunUrls(runId, {
          ticketUrl: context.ticketUrl,
        });
        this.logger.log(`[Run ${runId}] Step 3: Ticket URL persisted to database`);
      }

      // Step 4: Remediation
      this.logger.log(`[Run ${runId}] Step 4: Starting Remediation`);
      const remediationResult = await this.executeStep(context, 4, async () => {
        return this.remediationStep.execute(context);
      });

      if (!remediationResult.success) {
        this.logger.error(
          `[Run ${runId}] Step 4: Remediation failed - ${remediationResult.error}`,
        );
        await this.handleStepFailure(context, 4, remediationResult.error, true);
        return;
      }
      context.remediation = remediationResult.data;
      this.logger.log(
        `[Run ${runId}] Step 4: Remediation completed - Applied: ${context.remediation?.applied}, Changes: ${context.remediation?.changes?.length || 0}`,
      );

      // Persist PR URL to the run record
      if (context.remediation?.pullRequestUrl) {
        await this.runsService.updateRunUrls(runId, {
          pullRequestUrl: context.remediation.pullRequestUrl,
        });
        this.logger.log(
          `[Run ${runId}] Step 4: PR URL persisted - ${context.remediation.pullRequestUrl}`,
        );
      } else {
        this.logger.warn(`[Run ${runId}] Step 4: No PR URL created`);
      }

      // Step 5: Ticket Update
      this.logger.log(`[Run ${runId}] Step 5: Starting Ticket Update`);
      const ticketResult = await this.executeStep(context, 5, async () => {
        return this.ticketUpdateStep.execute(context);
      });

      if (!ticketResult.success) {
        this.logger.error(
          `[Run ${runId}] Step 5: Ticket Update failed - ${ticketResult.error}`,
        );
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

      this.logger.log(`[Run ${runId}] Step 5: Ticket Update completed`);
      await this.runsService.updateRunStatus(runId, RunStatus.SUCCESS);
      this.logger.log(`[Run ${runId}] Pipeline execution completed successfully`);
    } catch (error) {
      this.logger.error(`[Run ${runId}] Pipeline execution error:`, error);
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
