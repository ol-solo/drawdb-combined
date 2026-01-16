/* eslint-disable @typescript-eslint/no-unused-vars */
import { type AxiosError } from 'axios';
import { Request, Response } from 'express';
import { IGistCommitItem } from '../interfaces/gist-commit-item';
import { IGistFile } from '../interfaces/gist-file';
import { GitLabShareService } from '../services/gitlab-share-service';

async function get(req: Request, res: Response) {
  try {
    const shareId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await GitLabShareService.getShare(shareId);

    // Преобразуем формат для совместимости с фронтендом
    const cleanedFiles = Object.fromEntries(
      Object.entries(data.files).map(([filename, fileData]) => [
        filename,
        {
          filename: fileData.filename || filename,
          content: fileData.content,
          type: 'application/json',
          language: 'JSON',
          size: fileData.content.length,
          truncated: false,
        },
      ]),
    );

    res.status(200).json({
      success: true,
      data: {
        id: data.id,
        files: cleanedFiles,
        updated_at: data.updated_at,
        created_at: data.created_at,
      },
    });
  } catch (e) {
    console.error(e);
    const error = e as Error;
    if (error.message === 'Share not found') {
      res.status(404).json({
        success: false,
        message: 'Gist not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Something went wrong',
      });
    }
  }
}

async function create(req: Request, res: Response) {
  try {
    const { description, filename, content, public: isGistPublic } = req.body;

    // Валидация обязательных полей
    if (!content) {
      res.status(400).json({
        success: false,
        message: 'Content is required',
      });
      return;
    }

    const data = await GitLabShareService.createShare(content, filename);

    const returnData = {
      id: data.id,
      files: data.files,
    };

    res.status(200).json({
      success: true,
      data: returnData,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
}

async function update(req: Request, res: Response) {
  try {
    const { filename, content } = req.body;

    // Если content не передан или пустой, удаляем файл
    const shareId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    let deleted = false;
    
    if (content === undefined || content === null || content === '') {
      try {
        await GitLabShareService.deleteShare(shareId);
        deleted = true;
      } catch (error) {
        console.error('Error deleting share:', error);
        const deleteError = error as Error;
        if (deleteError.message === 'Share not found') {
          return res.status(404).json({
            success: false,
            message: 'Gist not found',
          });
        }
        throw error; // Пробрасываем другие ошибки
      }
    } else {
      await GitLabShareService.updateShare(shareId, content, filename);
    }

    res.status(200).json({
      deleted,
      success: true,
      message: deleted ? 'Gist deleted' : 'Gist updated',
    });
  } catch (e) {
    console.error(e);
    const error = e as Error;
    if (error.message === 'Share not found') {
      res.status(404).json({
        success: false,
        message: 'Gist not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Something went wrong',
      });
    }
  }
}

async function del(req: Request, res: Response) {
  try {
    const shareId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await GitLabShareService.deleteShare(shareId);

    res.status(200).json({
      success: true,
      message: 'Gist deleted',
    });
  } catch (e) {
    console.error(e);
    const error = e as Error;
    if (error.message === 'Share not found') {
      res.status(404).json({
        success: false,
        message: 'Gist not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Something went wrong',
      });
    }
  }
}

async function getCommits(req: Request, res: Response) {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const perPage = req.query.per_page ? parseInt(req.query.per_page as string) : undefined;
    
    // Валидация shareId
    const shareId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!shareId) {
      res.status(400).json({
        success: false,
        message: 'Share ID is required',
      });
      return;
    }
    
    const data = await GitLabShareService.getCommits(shareId, perPage, page);

    // Формат уже совместим с IGistCommitItem (без user и url)
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Share not found') {
      res.status(404).json({
        success: false,
        message: 'Gist not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Something went wrong',
      });
    }
  }
}

async function getRevision(req: Request, res: Response) {
  try {
    const shareId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const commitSha = Array.isArray(req.params.sha) ? req.params.sha[0] : req.params.sha;
    const data = await GitLabShareService.getShareByRevision(shareId, commitSha);

    // Преобразуем формат для совместимости с фронтендом
    const cleanedFiles = Object.fromEntries(
      Object.entries(data.files).map(([filename, fileData]) => [
        filename,
        {
          filename: fileData.filename || filename,
          content: fileData.content,
          type: 'application/json',
          language: 'JSON',
          size: fileData.content.length,
          truncated: false,
        },
      ]),
    );

    res.status(200).json({
      success: true,
      data: {
        id: data.id,
        files: cleanedFiles,
        updated_at: data.updated_at,
        created_at: data.created_at,
      },
    });
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Share or revision not found' || error.message === 'Share not found') {
      res.status(404).json({
        success: false,
        message: 'Gist not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Something went wrong',
      });
    }
  }
}

async function getRevisionsForFile(req: Request, res: Response) {
  try {
    const shareId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const file = Array.isArray(req.params.file) ? req.params.file[0] : req.params.file;

    const cursor = req.query.cursor as string;
    const limitRaw = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 10 : Math.min(limitRaw, 100); // Максимум 100

    const batchSize = Math.max(limit * 2, 50);
    let page = 1;
    let startProcessing = !cursor;

    const versionsWithChanges: IGistCommitItem[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;

    while (versionsWithChanges.length < limit && hasMore) {
      const commitsBatch = await GitLabShareService.getCommits(shareId, batchSize, page);

      if (commitsBatch.length === 0) {
        hasMore = false;
        break;
      }

      for (let i = 0; i < commitsBatch.length && versionsWithChanges.length < limit; i++) {
        const currentCommit = commitsBatch[i];

        if (!startProcessing) {
          if (currentCommit.version === cursor) {
            startProcessing = true;
          }
          continue;
        }

        if (versionsWithChanges.length === 0) {
          const version = await GitLabShareService.getShareByRevision(shareId, currentCommit.version);
          if (version.files[file]) {
            versionsWithChanges.push(currentCommit);
          }
          continue;
        }

        const lastAddedCommit = versionsWithChanges[versionsWithChanges.length - 1];

        try {
          const [lastVersion, currentVersion] = await Promise.all([
            GitLabShareService.getShareByRevision(shareId, lastAddedCommit.version),
            GitLabShareService.getShareByRevision(shareId, currentCommit.version),
          ]);

          if (!currentVersion.files[file]) {
            break;
          }

          if (!lastVersion.files[file]) {
            versionsWithChanges.push(currentCommit);
            continue;
          }

          const lastContent = lastVersion.files[file].content;
          const currentContent = currentVersion.files[file].content;

          if (lastContent !== currentContent) {
            versionsWithChanges.push(currentCommit);
          }
        } catch (error) {
          console.error(`Error comparing versions:`, error);
          versionsWithChanges.push(currentCommit);
        }
      }

      if (commitsBatch.length < batchSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    if (versionsWithChanges.length === limit) {
      nextCursor = versionsWithChanges[versionsWithChanges.length - 1].version;
    }

    // Формат уже совместим (без user и url)
    res.status(200).json({
      success: true,
      data: versionsWithChanges,
      pagination: {
        cursor: nextCursor,
        hasMore: nextCursor !== null,
        limit,
        count: versionsWithChanges.length,
      },
    });
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Share not found' || error.message === 'Share or revision not found') {
      res.status(404).json({
        success: false,
        message: 'Gist not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Something went wrong',
      });
    }
  }
}

export { get, create, del, update, getCommits, getRevision, getRevisionsForFile };
