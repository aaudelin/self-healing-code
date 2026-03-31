import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinearService {
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LINEAR_API_KEY');
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
    if (!this.apiKey) {
      return {
        id: 'mock-issue-id',
        url: 'https://linear.app/mock/issue/MOCK-1',
      };
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

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        data?: {
          issueCreate?: {
            success: boolean;
            issue: { id: string; url: string };
          };
        };
      };
      if (data.data?.issueCreate?.success) {
        return {
          id: data.data.issueCreate.issue.id,
          url: data.data.issueCreate.issue.url,
        };
      }

      return null;
    } catch (error) {
      console.error('Error creating Linear issue:', error);
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
