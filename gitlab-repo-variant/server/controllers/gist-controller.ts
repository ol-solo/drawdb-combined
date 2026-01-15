/* eslint-disable @typescript-eslint/no-unused-vars */
import { type AxiosError } from 'axios';
import { Request, Response } from 'express';
import { getShareProvider } from '../services/providers';

const provider = getShareProvider();

function firstParam(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

async function get(req: Request, res: Response) {
  try {
    const id = firstParam(req.params.id);
    res.status(200).json({
      success: true,
      data: await provider.getShare({ id }),
    });
  } catch (e) {
    console.error(e);
    if ((e as AxiosError).response?.status === 404) {
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

    res.status(200).json({
      success: true,
      data: await provider.createShareFile({ filename, content, description }),
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

    const id = firstParam(req.params.id);
    await provider.upsertShareFile({ id, filename, content });

    res.status(200).json({
      deleted: false,
      success: true,
      message: 'Gist updated',
    });
  } catch (e) {
    console.error(e);
    if ((e as AxiosError).response?.status === 404) {
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
    const id = firstParam(req.params.id);
    await provider.deleteShare({ id });

    res.status(200).json({
      success: true,
      message: 'Gist deleted',
    });
  } catch (e) {
    console.error(e);
    if ((e as AxiosError).response?.status === 404) {
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
    const id = firstParam(req.params.id);
    const cleanData = await provider.listCommits({ id, perPage, page });

    res.status(200).json({
      success: true,
      data: cleanData,
    });
  } catch (e) {
    if ((e as AxiosError).response?.status === 404) {
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
    const id = firstParam(req.params.id);
    const sha = firstParam(req.params.sha);
    res.status(200).json({
      success: true,
      data: await provider.getShare({ id, ref: sha }),
    });
  } catch (e) {
    if ((e as AxiosError).response?.status === 404) {
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
    const gistId = firstParam(req.params.id);
    const file = firstParam(req.params.file);

    const cursor = req.query.cursor as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const batchSize = Math.max(limit * 2, 50);
    let page = 1;
    let startProcessing = !cursor;

    const versionsWithChanges: { version: string; committed_at: string }[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;

    while (versionsWithChanges.length < limit && hasMore) {
      const commitsBatch = await provider.listFileCommits({
        id: gistId,
        filename: file,
        perPage: batchSize,
        page,
      });

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
          const content = await provider.getFileContentAtRef({
            id: gistId,
            filename: file,
            ref: currentCommit.version,
          });
          if (content !== null) {
            versionsWithChanges.push(currentCommit);
          }
          continue;
        }

        const lastAddedCommit = versionsWithChanges[versionsWithChanges.length - 1];

        try {
          const [lastContent, currentContent] = await Promise.all([
            provider.getFileContentAtRef({ id: gistId, filename: file, ref: lastAddedCommit.version }),
            provider.getFileContentAtRef({ id: gistId, filename: file, ref: currentCommit.version }),
          ]);

          if (currentContent === null) {
            break;
          }

          if (lastContent === null) {
            versionsWithChanges.push(currentCommit);
            continue;
          }

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
    if ((e as AxiosError).response?.status === 404) {
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
