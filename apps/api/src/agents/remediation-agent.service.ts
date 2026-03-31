import {
  AnalysisReport,
  RemediationResult,
  FileChange,
  RepositoryContext,
  REMEDIATION_CONFIDENCE_THRESHOLD,
} from '@aiops/shared';
import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RemediationAgentService {
  private readonly client: Anthropic | null;
  private readonly model = 'claude-sonnet-4-6';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async remediate(
    analysis: AnalysisReport,
    repository: RepositoryContext,
  ): Promise<RemediationResult> {
    if (analysis.confidence < REMEDIATION_CONFIDENCE_THRESHOLD) {
      return {
        applied: false,
        changes: [],
        message: `Confidence level (${analysis.confidence}) is below threshold (${REMEDIATION_CONFIDENCE_THRESHOLD}). Manual review required.`,
      };
    }

    if (!this.client) {
      return this.getMockRemediation(analysis, repository);
    }

    const prompt = this.buildPrompt(analysis, repository);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return this.parseRemediationResponse(content.text);
    } catch (error) {
      console.error('Remediation agent error:', error);
      return this.getMockRemediation(analysis, repository);
    }
  }

  private buildPrompt(
    analysis: AnalysisReport,
    repository: RepositoryContext,
  ): string {
    const affectedFilesContent = repository.files
      .filter((f) => analysis.affectedFiles.includes(f.path))
      .map((f) => `### ${f.path}\n\`\`\`typescript\n${f.content}\n\`\`\``)
      .join('\n\n');

    return `You are an expert software engineer implementing a fix for a production error.

## Analysis Report
- Error Type: ${analysis.errorType}
- Severity: ${analysis.severity}
- Summary: ${analysis.summary}
- Root Cause: ${analysis.rootCause}
- Suggested Fix: ${analysis.suggestedFix}
- Affected Files: ${analysis.affectedFiles.join(', ')}

## Files to Modify
${affectedFilesContent}

## Task
Generate the complete fixed content for each affected file. Respond in the following JSON format:

{
  "applied": true,
  "changes": [
    {
      "path": "string - file path",
      "diff": "string - the COMPLETE new file content (not a diff)",
      "description": "string - description of changes made"
    }
  ],
  "message": "string - summary of changes applied"
}

Important:
1. Provide the COMPLETE file content, not just the changed parts
2. Maintain existing code style and formatting
3. Only modify what is necessary to fix the issue
4. Add appropriate error handling without over-engineering

Respond ONLY with valid JSON, no additional text.`;
  }

  private parseRemediationResponse(response: string): RemediationResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as RemediationResult;
    } catch (error) {
      console.error('Failed to parse remediation response:', error);
      return {
        applied: false,
        changes: [],
        message: 'Failed to parse AI response',
      };
    }
  }

  private getMockRemediation(
    analysis: AnalysisReport,
    repository: RepositoryContext,
  ): RemediationResult {
    const changes: FileChange[] = [];

    for (const filePath of analysis.affectedFiles) {
      const file = repository.files.find((f) => f.path === filePath);
      if (!file) continue;

      if (filePath.includes('users/[id]')) {
        changes.push({
          path: filePath,
          diff: `import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ name: user.name, email: user.email });
}`,
          description: 'Added null check for user query result with 404 response',
        });
      } else if (filePath.includes('orders/create')) {
        changes.push({
          path: filePath,
          diff: `import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  const { userId, items } = req.body;

  // Validate user exists before creating order
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const order = await prisma.order.create({
    data: {
      userId,
      items: { create: items }
    }
  });

  return res.json(order);
}`,
          description: 'Added user validation before order creation',
        });
      }
    }

    return {
      applied: changes.length > 0,
      changes,
      message:
        changes.length > 0
          ? `Applied ${changes.length} fix(es) for ${analysis.errorType}`
          : 'No changes could be generated',
    };
  }
}
