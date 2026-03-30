import { Injectable } from '@nestjs/common';

import { LinearService } from '../../providers/linear.service';
import { ExecutionContext } from '../execution.service';

@Injectable()
export class TicketUpdateStep {
  constructor(private readonly linearService: LinearService) {}

  async execute(context: ExecutionContext): Promise<{
    success: boolean;
    data?: { updated: boolean };
    error?: string;
  }> {
    if (!context.ticketId) {
      return {
        success: true,
        data: { updated: false },
      };
    }

    try {
      let commentBody = '## Pipeline Execution Complete\n\n';

      if (context.remediation?.applied) {
        commentBody += '### Remediation Applied\n';
        commentBody += context.remediation.message + '\n\n';

        if (context.remediation.pullRequestUrl) {
          commentBody += `### Pull Request\n${context.remediation.pullRequestUrl}\n\n`;
        }

        commentBody += '### Changes Made\n';
        for (const change of context.remediation.changes) {
          commentBody += `- **${change.path}**: ${change.description}\n`;
        }
      } else {
        commentBody += '### Remediation Skipped\n';
        commentBody += context.remediation?.message || 'No remediation applied.';
        commentBody += '\n\nManual review and intervention may be required.';
      }

      commentBody += '\n\n---\n*Updated by AIOps Self-Healing Pipeline*';

      const success = await this.linearService.addComment(
        context.ticketId,
        commentBody,
      );

      return {
        success: true,
        data: { updated: success },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update ticket',
      };
    }
  }
}
