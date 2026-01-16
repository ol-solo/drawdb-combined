import axios, { type AxiosError } from 'axios';
import { gitlabBaseUrl, projectId, defaultRef, sharesPathPrefix, headers } from '../constants/gitlab-constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get file path for a share
 */
function getShareFilePath(shareId: string): string {
  return `${sharesPathPrefix}${shareId}.json`;
}

/**
 * GitLab Share Service - работает с GitLab Repository API
 * Хранит каждую "шару" как отдельный файл в репозитории
 */
export const GitLabShareService = {
  /**
   * Создать новую "шару"
   * Генерирует shareId и создаёт файл в репозитории
   */
  createShare: async (content: string, filename?: string): Promise<{ id: string; files: Record<string, { content: string }> }> => {
    const shareId = uuidv4();
    const filePath = getShareFilePath(shareId);
    const actualFilename = filename || 'share.json';

    try {
      const { data } = await axios.post(
        `${gitlabBaseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
        {
          branch: defaultRef,
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64',
          commit_message: `Create share ${shareId}`,
        },
        { headers },
      );

      return {
        id: shareId,
        files: {
          [actualFilename]: { content },
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400 && axiosError.response?.data) {
        const errorData = axiosError.response.data as { message?: string };
        if (errorData.message?.includes('already exists')) {
          // Если файл уже существует (маловероятно для UUID), пробуем снова
          return GitLabShareService.createShare(content, filename);
        }
      }
      throw error;
    }
  },

  /**
   * Получить "шару" по ID
   */
  getShare: async (shareId: string): Promise<{ id: string; files: Record<string, { content: string; filename: string }>; updated_at: string; created_at: string }> => {
    const filePath = getShareFilePath(shareId);

    try {
      const { data } = await axios.get(
        `${gitlabBaseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
        {
          headers,
          params: {
            ref: defaultRef,
          },
        },
      );

      // Декодируем base64 контент
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const filename = filePath.split('/').pop() || 'share.json';

      return {
        id: shareId,
        files: {
          [filename]: {
            content,
            filename,
          },
        },
        updated_at: data.last_commit_id ? new Date().toISOString() : data.updated_at || new Date().toISOString(),
        created_at: data.created_at || new Date().toISOString(),
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new Error('Share not found');
      }
      throw error;
    }
  },

  /**
   * Обновить "шару"
   */
  updateShare: async (shareId: string, content: string, filename?: string): Promise<{ id: string; files: Record<string, { content: string }> }> => {
    const filePath = getShareFilePath(shareId);
    const actualFilename = filename || 'share.json';

    try {
      const { data } = await axios.put(
        `${gitlabBaseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
        {
          branch: defaultRef,
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64',
          commit_message: `Update share ${shareId}`,
        },
        { headers },
      );

      return {
        id: shareId,
        files: {
          [actualFilename]: { content },
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new Error('Share not found');
      }
      throw error;
    }
  },

  /**
   * Удалить "шару"
   */
  deleteShare: async (shareId: string): Promise<void> => {
    const filePath = getShareFilePath(shareId);

    try {
      await axios.delete(
        `${gitlabBaseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
        {
          headers,
          data: {
            branch: defaultRef,
            commit_message: `Delete share ${shareId}`,
          },
        },
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        // Файл уже удалён или не существует - это нормально
        return;
      }
      throw error;
    }
  },

  /**
   * Получить список коммитов для "шары"
   */
  getCommits: async (shareId: string, perPage?: number, page?: number): Promise<Array<{ version: string; commited_at: string; change_status: { total: number; additions: number; deletions: number } }>> => {
    const filePath = getShareFilePath(shareId);

    try {
      const { data } = await axios.get(
        `${gitlabBaseUrl}/projects/${projectId}/repository/commits`,
        {
          headers,
          params: {
            path: filePath,
            ref_name: defaultRef,
            per_page: perPage || 100,
            page: page || 1,
          },
        },
      );

      return data.map((commit: any) => ({
        version: commit.id,
        commited_at: commit.committed_date || commit.created_at,
        change_status: {
          total: (commit.stats?.additions || 0) + (commit.stats?.deletions || 0),
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
        },
      }));
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new Error('Share not found');
      }
      throw error;
    }
  },

  /**
   * Получить "шару" на конкретной ревизии (commit sha)
   */
  getShareByRevision: async (shareId: string, commitSha: string): Promise<{ id: string; files: Record<string, { content: string; filename: string }>; updated_at: string; created_at: string }> => {
    const filePath = getShareFilePath(shareId);

    try {
      const { data } = await axios.get(
        `${gitlabBaseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
        {
          headers,
          params: {
            ref: commitSha,
          },
        },
      );

      // Декодируем base64 контент
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const filename = filePath.split('/').pop() || 'share.json';

      return {
        id: shareId,
        files: {
          [filename]: {
            content,
            filename,
          },
        },
        updated_at: data.last_commit_id ? new Date().toISOString() : data.updated_at || new Date().toISOString(),
        created_at: data.created_at || new Date().toISOString(),
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new Error('Share or revision not found');
      }
      throw error;
    }
  },
};
