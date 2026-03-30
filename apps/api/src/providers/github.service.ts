import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RepositoryContext, FileChange } from '@aiops/shared';

interface GitHubFile {
  path: string;
  type: string;
}

interface GitHubContent {
  content: string;
  encoding: string;
}

@Injectable()
export class GitHubService {
  private readonly token: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('GITHUB_TOKEN');
  }

  async testConnection(
    config: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.token) {
      return { success: false, message: 'GITHUB_TOKEN not configured' };
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!response.ok) {
        return {
          success: false,
          message: `GitHub API error: ${response.status}`,
        };
      }

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async fetchRepository(
    config: Record<string, string>,
  ): Promise<RepositoryContext> {
    if (!this.token) {
      return this.getMockRepository();
    }

    try {
      const branch = config.branch || 'main';
      const treeResponse = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!treeResponse.ok) {
        return this.getMockRepository();
      }

      const treeData = await treeResponse.json();
      const relevantFiles = (treeData.tree as GitHubFile[])
        .filter(
          (item: GitHubFile) =>
            item.type === 'blob' &&
            (item.path.endsWith('.ts') ||
              item.path.endsWith('.tsx') ||
              item.path.endsWith('.js') ||
              item.path.endsWith('.jsx')),
        )
        .slice(0, 20);

      const files = await Promise.all(
        relevantFiles.map(async (file: GitHubFile) => {
          const contentResponse = await fetch(
            `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${file.path}?ref=${branch}`,
            {
              headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            },
          );

          if (contentResponse.ok) {
            const contentData = (await contentResponse.json()) as GitHubContent;
            const content = Buffer.from(
              contentData.content,
              contentData.encoding as BufferEncoding,
            ).toString('utf-8');
            return { path: file.path, content };
          }
          return { path: file.path, content: '' };
        }),
      );

      const structure = relevantFiles.map((f: GitHubFile) => f.path).join('\n');

      return { files, structure };
    } catch (error) {
      console.error('Error fetching GitHub repository:', error);
      return this.getMockRepository();
    }
  }

  async createPullRequest(
    config: Record<string, string>,
    changes: FileChange[],
    title: string,
    body: string,
  ): Promise<{ url: string } | null> {
    if (!this.token) {
      return { url: 'https://github.com/mock/repo/pull/1' };
    }

    try {
      const branchName = `fix/aiops-${Date.now()}`;
      const baseBranch = config.branch || 'main';

      const refResponse = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/refs/heads/${baseBranch}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!refResponse.ok) {
        return null;
      }

      const refData = await refResponse.json();
      const baseSha = refData.object.sha;

      await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/git/refs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: baseSha,
          }),
        },
      );

      for (const change of changes) {
        const existingFileResponse = await fetch(
          `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${change.path}?ref=${branchName}`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        );

        const existingFile = existingFileResponse.ok
          ? await existingFileResponse.json()
          : null;

        await fetch(
          `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${change.path}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: change.description,
              content: Buffer.from(change.diff).toString('base64'),
              branch: branchName,
              ...(existingFile && { sha: existingFile.sha }),
            }),
          },
        );
      }

      const prResponse = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/pulls`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            body,
            head: branchName,
            base: baseBranch,
          }),
        },
      );

      if (prResponse.ok) {
        const prData = await prResponse.json();
        return { url: prData.html_url };
      }

      return null;
    } catch (error) {
      console.error('Error creating GitHub PR:', error);
      return null;
    }
  }

  private getMockRepository(): RepositoryContext {
    return {
      files: [
        {
          path: 'src/api/users/[id].ts',
          content: `import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  // Bug: Not handling case when user is not found
  const user = await prisma.user.findUnique({ where: { id } });

  // This will throw if user is null
  return res.json({ name: user.name, email: user.email });
}`,
        },
        {
          path: 'src/api/orders/create.ts',
          content: `import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  const { userId, items } = req.body;

  // Bug: Not validating that user exists before creating order
  const order = await prisma.order.create({
    data: {
      userId,
      items: { create: items }
    }
  });

  return res.json(order);
}`,
        },
      ],
      structure: `src/
  api/
    users/
      [id].ts
    orders/
      create.ts
  lib/
    prisma.ts`,
    };
  }
}
