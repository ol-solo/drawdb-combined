import axios, { type AxiosError } from 'axios';
import { gitlabBaseUrl, projectId, defaultRef, sharesPathPrefix, headers } from '../constants/gitlab-constants';
import { v4 as uuidv4 } from 'uuid';
import { validateShareId, validateCommitSha, validateContent, validateFilename, validatePage, validatePerPage } from '../utils/validation';

/**
 * Get file path for a share
 * Валидирует shareId для предотвращения path traversal
 */
function getShareFilePath(shareId: string): string {
  if (!validateShareId(shareId)) {
    throw new Error('Invalid share ID format');
  }
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
    // Валидация content
    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
      throw new Error(contentValidation.error || 'Invalid content');
    }
    
    const shareId = uuidv4();
    const filePath = getShareFilePath(shareId);
    const actualFilename = validateFilename(filename);

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
          // Если файл уже существует (маловероятно для UUID), генерируем новый ID
          // Ограничиваем рекурсию - максимум 3 попытки
          const maxRetries = 3;
          let retries = 0;
          while (retries < maxRetries) {
            const newShareId = uuidv4();
            // Прямо формируем путь без валидации, т.к. UUID всегда валиден
            const newFilePath = `${sharesPathPrefix}${newShareId}.json`;
            try {
              const { data } = await axios.post(
                `${gitlabBaseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(newFilePath)}`,
                {
                  branch: defaultRef,
                  content: Buffer.from(content).toString('base64'),
                  encoding: 'base64',
                  commit_message: `Create share ${newShareId}`,
                },
                { headers },
              );
              return {
                id: newShareId,
                files: {
                  [actualFilename]: { content },
                },
              };
            } catch (retryError) {
              retries++;
              if (retries >= maxRetries) {
                throw new Error('Failed to create share after multiple attempts');
              }
            }
          }
        }
      }
      throw error;
    }
  },

  /**
   * Получить "шару" по ID
   */
  getShare: async (shareId: string): Promise<{ id: string; files: Record<string, { content: string; filename: string }>; updated_at: string; created_at: string }> => {
    // Валидация shareId
    if (!validateShareId(shareId)) {
      throw new Error('Invalid share ID format');
    }
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
    // Валидация shareId
    if (!validateShareId(shareId)) {
      throw new Error('Invalid share ID format');
    }
    
    // Валидация content
    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
      throw new Error(contentValidation.error || 'Invalid content');
    }
    
    const filePath = getShareFilePath(shareId);
    const actualFilename = validateFilename(filename);

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
    // Валидация shareId
    if (!validateShareId(shareId)) {
      throw new Error('Invalid share ID format');
    }
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
    // Валидация shareId
    if (!validateShareId(shareId)) {
      throw new Error('Invalid share ID format');
    }
    
    // Валидация и нормализация параметров пагинации
    const validatedPage = validatePage(page);
    const validatedPerPage = validatePerPage(perPage);
    
    const filePath = getShareFilePath(shareId);

    try {
      const { data } = await axios.get(
        `${gitlabBaseUrl}/projects/${projectId}/repository/commits`,
        {
          headers,
          params: {
            path: filePath,
            ref: defaultRef,
            per_page: validatedPerPage,
            page: validatedPage,
            with_stats: true, // Включаем статистику изменений
          },
        },
      );

      // Проверяем что data - массив
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((commit: any) => {
        // Проверяем наличие обязательных полей
        if (!commit || !commit.id) {
          return null;
        }
        return {
          version: commit.id,
          commited_at: commit.committed_date || commit.created_at || new Date().toISOString(),
          change_status: {
            total: (commit.stats?.additions || 0) + (commit.stats?.deletions || 0),
            additions: commit.stats?.additions || 0,
            deletions: commit.stats?.deletions || 0,
          },
        };
      }).filter((commit) => commit !== null) as Array<{ version: string; commited_at: string; change_status: { total: number; additions: number; deletions: number } }>;
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
    // Валидация shareId
    if (!validateShareId(shareId)) {
      throw new Error('Invalid share ID format');
    }
    
    // Валидация commit SHA
    if (!validateCommitSha(commitSha)) {
      throw new Error('Invalid commit SHA format');
    }
    
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
