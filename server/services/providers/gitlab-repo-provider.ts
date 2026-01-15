import axios, { type AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { config } from '../../config';
import type {
  ShareCommitItem,
  ShareFilesMap,
  ShareGetResult,
  ShareProvider,
} from './share-provider';

type GitLabTreeItem = {
  id: string;
  name: string;
  type: 'tree' | 'blob' | string;
  path: string;
  mode: string;
};

type GitLabCommit = {
  id: string;
  created_at: string;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function getGitlabApiBaseUrl() {
  const base = normalizeBaseUrl(config.api.gitlab.baseUrl || '');
  return `${base}/api/v4`;
}

function getGitlabHeaders() {
  return {
    'PRIVATE-TOKEN': config.api.gitlab.token,
  };
}

function ensureConfigured() {
  if (!config.api.gitlab.baseUrl || !config.api.gitlab.token || !config.api.gitlab.projectId) {
    throw new Error('GitLab repo provider is not configured (GITLAB_BASE_URL/GITLAB_TOKEN/GITLAB_PROJECT_ID)');
  }
}

function encodeFilePath(filePath: string) {
  // GitLab expects file_path as URL-encoded path segment (slashes included)
  return encodeURIComponent(filePath);
}

function shareDir(shareId: string) {
  const prefix = (config.api.gitlab.sharesPathPrefix || 'shares').replace(/^\/+|\/+$/g, '');
  return `${prefix}/${shareId}`;
}

function shareFilePath(shareId: string, filename: string) {
  return `${shareDir(shareId)}/${filename}`;
}

function decodeGitlabContentBase64(content: string | undefined) {
  if (!content) return '';
  return Buffer.from(content, 'base64').toString('utf8');
}

function isNotFound(err: unknown) {
  const status = (err as AxiosError).response?.status;
  return status === 404;
}

export class GitlabRepoProvider implements ShareProvider {
  async createShareFile(params: { filename: string; content: string; description?: string }) {
    ensureConfigured();

    const id = randomUUID();
    const filePath = shareFilePath(id, params.filename);
    const apiBase = getGitlabApiBaseUrl();

    await axios.post(
      `${apiBase}/projects/${encodeURIComponent(config.api.gitlab.projectId)}/repository/files/${encodeFilePath(
        filePath,
      )}`,
      {
        branch: config.api.gitlab.ref,
        content: params.content,
        commit_message: params.description
          ? `create share ${id}: ${params.description}`
          : `create share ${id}`,
      },
      { headers: getGitlabHeaders() },
    );

    const files: ShareFilesMap = {
      [params.filename]: {
        filename: params.filename,
        content: params.content,
      },
    };

    return { id, files };
  }

  async upsertShareFile(params: { id: string; filename: string; content: string }) {
    ensureConfigured();

    const filePath = shareFilePath(params.id, params.filename);
    const apiBase = getGitlabApiBaseUrl();
    const url = `${apiBase}/projects/${encodeURIComponent(
      config.api.gitlab.projectId,
    )}/repository/files/${encodeFilePath(filePath)}`;

    try {
      await axios.put(
        url,
        {
          branch: config.api.gitlab.ref,
          content: params.content,
          commit_message: `update share ${params.id}: ${params.filename}`,
        },
        { headers: getGitlabHeaders() },
      );
    } catch (e) {
      // If file doesn't exist yet, create it
      if ((e as AxiosError).response?.status === 400 || isNotFound(e)) {
        await axios.post(
          url,
          {
            branch: config.api.gitlab.ref,
            content: params.content,
            commit_message: `create file for share ${params.id}: ${params.filename}`,
          },
          { headers: getGitlabHeaders() },
        );
        return;
      }
      throw e;
    }
  }

  private async listShareFiles(params: { id: string; ref?: string }): Promise<string[]> {
    ensureConfigured();

    const apiBase = getGitlabApiBaseUrl();
    const { data } = await axios.get(
      `${apiBase}/projects/${encodeURIComponent(config.api.gitlab.projectId)}/repository/tree`,
      {
        headers: getGitlabHeaders(),
        params: {
          path: shareDir(params.id),
          ref: params.ref || config.api.gitlab.ref,
          recursive: true,
          per_page: 100,
        },
      },
    );

    const items = (data || []) as GitLabTreeItem[];
    return items.filter((x) => x.type === 'blob').map((x) => x.path);
  }

  private async getFileContentByPath(params: { filePath: string; ref?: string }): Promise<string> {
    ensureConfigured();

    const apiBase = getGitlabApiBaseUrl();
    const { data } = await axios.get(
      `${apiBase}/projects/${encodeURIComponent(
        config.api.gitlab.projectId,
      )}/repository/files/${encodeFilePath(params.filePath)}`,
      {
        headers: getGitlabHeaders(),
        params: { ref: params.ref || config.api.gitlab.ref },
      },
    );

    return decodeGitlabContentBase64(data?.content);
  }

  async getShare(params: { id: string; ref?: string }): Promise<ShareGetResult> {
    ensureConfigured();

    const filePaths = await this.listShareFiles({ id: params.id, ref: params.ref });
    const filesEntries = await Promise.all(
      filePaths.map(async (path) => {
        const filename = path.split('/').pop() || path;
        const content = await this.getFileContentByPath({ filePath: path, ref: params.ref });
        return [filename, { filename, content }] as const;
      }),
    );

    const files: ShareFilesMap = Object.fromEntries(filesEntries);
    return { id: params.id, files };
  }

  async deleteShare(params: { id: string }) {
    ensureConfigured();

    const filePaths = await this.listShareFiles({ id: params.id, ref: config.api.gitlab.ref });
    if (!filePaths.length) return;

    const apiBase = getGitlabApiBaseUrl();
    await axios.post(
      `${apiBase}/projects/${encodeURIComponent(config.api.gitlab.projectId)}/repository/commits`,
      {
        branch: config.api.gitlab.ref,
        commit_message: `delete share ${params.id}`,
        actions: filePaths.map((p) => ({ action: 'delete', file_path: p })),
      },
      { headers: getGitlabHeaders() },
    );
  }

  async listCommits(params: { id: string; perPage?: number; page?: number }): Promise<ShareCommitItem[]> {
    ensureConfigured();

    const apiBase = getGitlabApiBaseUrl();
    const { data } = await axios.get<GitLabCommit[]>(
      `${apiBase}/projects/${encodeURIComponent(config.api.gitlab.projectId)}/repository/commits`,
      {
        headers: getGitlabHeaders(),
        params: {
          ref_name: config.api.gitlab.ref,
          path: shareDir(params.id),
          per_page: params.perPage,
          page: params.page,
        },
      },
    );

    return (data || []).map((c) => ({
      version: c.id,
      committed_at: c.created_at,
    }));
  }

  async listFileCommits(params: {
    id: string;
    filename: string;
    perPage?: number;
    page?: number;
  }): Promise<ShareCommitItem[]> {
    ensureConfigured();

    const apiBase = getGitlabApiBaseUrl();
    const { data } = await axios.get<GitLabCommit[]>(
      `${apiBase}/projects/${encodeURIComponent(config.api.gitlab.projectId)}/repository/commits`,
      {
        headers: getGitlabHeaders(),
        params: {
          ref_name: config.api.gitlab.ref,
          path: shareFilePath(params.id, params.filename),
          per_page: params.perPage,
          page: params.page,
        },
      },
    );

    return (data || []).map((c) => ({
      version: c.id,
      committed_at: c.created_at,
    }));
  }

  async getFileContentAtRef(params: { id: string; filename: string; ref: string }): Promise<string | null> {
    ensureConfigured();

    const filePath = shareFilePath(params.id, params.filename);
    try {
      return await this.getFileContentByPath({ filePath, ref: params.ref });
    } catch (e) {
      if (isNotFound(e)) return null;
      throw e;
    }
  }
}

