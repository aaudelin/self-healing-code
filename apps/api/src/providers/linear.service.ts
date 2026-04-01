import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinearService {
  private readonly logger = new Logger(LinearService.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LINEAR_API_KEY');
    this.logger.log(
      `LinearService initialized - API key configured: ${!!this.apiKey}`,
    );
  }

  async testConnection(
    config: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.apiKey) {
      return { success: false, message: 'LINEAR_API_KEY not configured' };
    }

    try {

      const response: globalThis.Response = await fetch(
        'https://api.linear.app/graphql',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
          },
          body: JSON.stringify({
            query: `
            query Team($id: String!) {
              team(id: $id) {
                id
                name
              }
            }
          `,
            variables: { id: config.teamId },
          }),
        },
      );

      if (!response.ok) {
        return { success: false, message: `Linear API error: ${response.status}` };
      }

      const data = (await response.json()) as {
        data?: { team?: { id: string; name: string } };
        errors?: Array<{ message: string }>;
      };
      if (data.errors) {
        return { success: false, message: data.errors[0]?.message || 'API error' };
      }

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async createIssue(
    config: Record<string, string>,
    title: string,
    description: string,
  ): Promise<{ id: string; url: string } | null> {
    this.logger.log(`Creating Linear issue: "${title.substring(0, 50)}..."`);
    this.logger.debug(`Config: teamId=${config.teamId}, projectId=${config.projectId || 'none'}`);

    if (!this.apiKey) {
      this.logger.warn('No LINEAR_API_KEY configured, returning mock issue');
      return {
        id: 'mock-issue-id',
        url: 'https://linear.app/mock/issue/MOCK-1',
      };
    }

    try {

      this.logger.log('Sending GraphQL request to Linear API...');
      const response: globalThis.Response = await fetch(
        'https://api.linear.app/graphql',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
          },
          body: JSON.stringify({
            query: `
            mutation CreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) {
                success
                issue {
                  id
                  identifier
                  url
                }
              }
            }
          `,
            variables: {
              input: {
                teamId: config.teamId,
                title,
                description,
                ...(config.projectId && { projectId: config.projectId }),
              },
            },
          }),
        },
      );

      this.logger.log(`Linear API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Linear API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data = (await response.json()) as {
        data?: {
          issueCreate?: {
            success: boolean;
            issue: { id: string; url: string };
          };
        };
        errors?: Array<{ message: string }>;
      };

      if (data.errors) {
        this.logger.error(`Linear GraphQL errors: ${JSON.stringify(data.errors)}`);
        return null;
      }

      if (data.data?.issueCreate?.success) {
        this.logger.log(
          `Linear issue created successfully: ${data.data.issueCreate.issue.id} - ${data.data.issueCreate.issue.url}`,
        );
        return {
          id: data.data.issueCreate.issue.id,
          url: data.data.issueCreate.issue.url,
        };
      }

      this.logger.warn(`Linear issueCreate returned success=false or no data: ${JSON.stringify(data)}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error creating Linear issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  async updateIssue(
    issueId: string,
    update: { description?: string; stateId?: string },
  ): Promise<boolean> {
    if (!this.apiKey) {
      return true;
    }

    try {
      const response: globalThis.Response = await fetch(
        'https://api.linear.app/graphql',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
          },
          body: JSON.stringify({
            query: `
            mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
              issueUpdate(id: $id, input: $input) {
                success
              }
            }
          `,
            variables: {
              id: issueId,
              input: update,
            },
          }),
        },
      );

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as {
        data?: { issueUpdate?: { success: boolean } };
      };
      return data.data?.issueUpdate?.success ?? false;
    } catch (error) {
      console.error('Error updating Linear issue:', error);
      return false;
    }
  }

  async addComment(issueId: string, body: string): Promise<boolean> {
    if (!this.apiKey) {
      return true;
    }

    try {
      const response: globalThis.Response = await fetch(
        'https://api.linear.app/graphql',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
          },
          body: JSON.stringify({
            query: `
            mutation CreateComment($input: CommentCreateInput!) {
              commentCreate(input: $input) {
                success
              }
            }
          `,
            variables: {
              input: {
                issueId,
                body,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as {
        data?: { commentCreate?: { success: boolean } };
      };
      return data.data?.commentCreate?.success ?? false;
    } catch (error) {
      console.error('Error adding Linear comment:', error);
      return false;
    }
  }
}
