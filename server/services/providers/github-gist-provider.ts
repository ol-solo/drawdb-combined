import axios from 'axios';
import { config } from '../../config';
import type { ShareCommitItem, ShareGetResult, ShareProvider, ShareFilesMap } from './share-provider';

const gistsBaseUrl = 'https://api.github.com/gists';

type GithubGistFile = {
  content?: string;
};

type GithubGistResponse = {
  id: string;
  files?: Record<string, GithubGistFile>;
};

type GithubGistCommitItem = {
  version: string;
  committed_at: string;
};

function getGithubHeaders() {
  return {
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: 'Bearer ' + config.api.github,
  };
}

export class GithubGistProvider implements ShareProvider {
  async createShareFile(params: { filename: string; content: string; description?: string }) {
    const { data } = await axios.post<GithubGistResponse>(
      gistsBaseUrl,
      {
        description: params.description || '',
        public: false,
        files: {
          [params.filename]: { content: params.content },
        },
      },
      { headers: getGithubHeaders() },
    );

    const files: ShareFilesMap = Object.fromEntries(
      Object.entries(data.files || {}).map(([filename, file]) => [filename, { filename, content: file.content ?? '' }]),
    );

    return { id: data.id, files };
  }

  async upsertShareFile(params: { id: string; filename: string; content: string }) {
    await axios.patch(
      `${gistsBaseUrl}/${params.id}`,
      {
        files: {
          [params.filename]: { content: params.content },
        },
      },
      { headers: getGithubHeaders() },
    );
  }

  async getShare(params: { id: string; ref?: string }): Promise<ShareGetResult> {
    const url = params.ref ? `${gistsBaseUrl}/${params.id}/${params.ref}` : `${gistsBaseUrl}/${params.id}`;
    const { data } = await axios.get<GithubGistResponse>(url, { headers: getGithubHeaders() });

    const files: ShareFilesMap = Object.fromEntries(
      Object.entries(data.files || {}).map(([filename, file]) => [filename, { filename, content: file.content ?? '' }]),
    );

    return { id: data.id, files };
  }

  async deleteShare(params: { id: string }) {
    await axios.delete(`${gistsBaseUrl}/${params.id}`, { headers: getGithubHeaders() });
  }

  async listCommits(params: { id: string; perPage?: number; page?: number }): Promise<ShareCommitItem[]> {
    const { data } = await axios.get<GithubGistCommitItem[]>(`${gistsBaseUrl}/${params.id}/commits`, {
      headers: getGithubHeaders(),
      params: { per_page: params.perPage, page: params.page },
    });

    return (data || []).map((c) => ({ version: c.version, committed_at: c.committed_at }));
  }

  async listFileCommits(params: {
    id: string;
    filename: string;
    perPage?: number;
    page?: number;
  }): Promise<ShareCommitItem[]> {
    // GitHub Gists only provide commits per gist; filter will be handled by controller logic.
    return this.listCommits({ id: params.id, perPage: params.perPage, page: params.page });
  }

  async getFileContentAtRef(params: { id: string; filename: string; ref: string }): Promise<string | null> {
    const { files } = await this.getShare({ id: params.id, ref: params.ref });
    return files[params.filename]?.content ?? null;
  }
}

