import Anthropic from '@anthropic-ai/sdk';
import {
  AnalysisReport,
  LogEntry,
  DatabaseSchema,
  RepositoryContext,
} from '@aiops/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalysisAgentService {
  private readonly client: Anthropic | null;
  private readonly model = 'claude-sonnet-4-6';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async analyze(
    logs: LogEntry[],
    repository: RepositoryContext,
    schema: DatabaseSchema,
  ): Promise<AnalysisReport> {
    if (!this.client) {
      return this.getMockAnalysis(logs);
    }

    const prompt = this.buildPrompt(logs, repository, schema);

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

      return this.parseAnalysisResponse(content.text);
    } catch (error) {
      console.error('Analysis agent error:', error);
      return this.getMockAnalysis(logs);
    }
  }

  private buildPrompt(
    logs: LogEntry[],
    repository: RepositoryContext,
    schema: DatabaseSchema,
  ): string {
    return `You are an expert software engineer analyzing production errors to identify root causes and suggest fixes.

## Error Logs
${logs.map((log) => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${log.stack ? `\n${log.stack}` : ''}`).join('\n\n')}

## Repository Structure
${repository.structure}

## Relevant Source Files
${repository.files.map((f) => `### ${f.path}\n\`\`\`typescript\n${f.content}\n\`\`\``).join('\n\n')}

## Database Schema
${JSON.stringify(schema, null, 2)}

## Task
Analyze the error logs and provide a detailed analysis in the following JSON format:

{
  "errorType": "string - the type of error (e.g., 'TypeError', 'DatabaseError', 'ValidationError')",
  "severity": "low | medium | high | critical",
  "summary": "string - a brief summary of the error",
  "rootCause": "string - detailed explanation of the root cause",
  "affectedFiles": ["array of file paths that need to be modified"],
  "suggestedFix": "string - detailed description of how to fix the issue, including code snippets if applicable",
  "confidence": 0.0-1.0
}

Respond ONLY with valid JSON, no additional text.`;
  }

  private parseAnalysisResponse(response: string): AnalysisReport {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as AnalysisReport;
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      return this.getMockAnalysis([]);
    }
  }

  private getMockAnalysis(logs: LogEntry[]): AnalysisReport {
    const hasTypeError = logs.some((l) =>
      l.message.includes('Cannot read property'),
    );
    const hasForeignKeyError = logs.some((l) =>
      l.message.includes('Foreign key constraint'),
    );

    if (hasTypeError) {
      return {
        errorType: 'TypeError',
        severity: 'high',
        summary:
          'Null pointer exception when accessing user properties without null check',
        rootCause:
          'The API handler at /api/users/[id].ts attempts to access properties on the user object without first checking if the user exists. When a user ID is requested that does not exist in the database, prisma.user.findUnique returns null, and accessing .name on null causes a TypeError.',
        affectedFiles: ['src/api/users/[id].ts'],
        suggestedFix: `Add a null check after the database query:

\`\`\`typescript
const user = await prisma.user.findUnique({ where: { id } });

if (!user) {
  return res.status(404).json({ error: 'User not found' });
}

return res.json({ name: user.name, email: user.email });
\`\`\`

This ensures a proper 404 response is returned when the user does not exist.`,
        confidence: 0.95,
      };
    }

    if (hasForeignKeyError) {
      return {
        errorType: 'DatabaseError',
        severity: 'high',
        summary:
          'Foreign key constraint violation when creating orders with non-existent user',
        rootCause:
          'The order creation endpoint at /api/orders/create.ts does not validate that the userId exists before attempting to create an order. This causes a foreign key constraint failure in the database.',
        affectedFiles: ['src/api/orders/create.ts'],
        suggestedFix: `Validate user existence before creating the order:

\`\`\`typescript
const user = await prisma.user.findUnique({ where: { id: userId } });

if (!user) {
  return res.status(400).json({ error: 'Invalid user ID' });
}

const order = await prisma.order.create({
  data: { userId, items: { create: items } }
});
\`\`\``,
        confidence: 0.92,
      };
    }

    return {
      errorType: 'Unknown',
      severity: 'medium',
      summary: 'Unable to determine specific error from logs',
      rootCause:
        'The provided logs do not contain enough information to determine a specific root cause.',
      affectedFiles: [],
      suggestedFix: 'Please provide more detailed error logs for analysis.',
      confidence: 0.3,
    };
  }
}
