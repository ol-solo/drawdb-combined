/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { type AxiosError } from 'axios';
import { Request, Response } from 'express';
import { IGistCommitItem } from '../interfaces/gist-commit-item';
import { IGistFile } from '../interfaces/gist-file';
import { gistsBaseUrl, headers } from '../constants/gist-constants';
import { GistService } from '../services/gist-service';

function firstParam(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

async function get(req: Request, res: Response) {
  try {
    const id = firstParam(req.params.id);
    const { data } = await axios.get(`${gistsBaseUrl}/${id}`, {
      headers,
    });

    const {
      owner,
      history,
      forks,
      user,
      url,
      forks_url,
      commits_url,
      git_pull_url,
      git_push_url,
      html_url,
      comments_url,
      ...rest
    } = data;

    const cleanedFiles = Object.fromEntries(
      Object.entries(rest.files as Record<string, IGistFile>).map(
        ([filename, { raw_url, ...fileWithoutRaw }]) => [filename, fileWithoutRaw],
      ),
    );

    res.status(200).json({
      success: true,
      data: { ...rest, files: cleanedFiles },
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

    const { data } = await axios.post(
      gistsBaseUrl,
      {
        description: description || '',
        public: isGistPublic || false,
        files: {
          [filename]: { content },
        },
      },
      { headers },
    );

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
    const id = firstParam(req.params.id);

    const { data } = await axios.patch(
      `${gistsBaseUrl}/${id}`,
      {
        files: {
          [filename]: { content },
        },
      },
      { headers },
    );

    let deleted = false;
    if (!Object.entries(data.files).length) {
      try {
        await GistService.deleteGist(id);
        deleted = true;
      } catch (error) {
        console.error('Error deleting gist:', error);
        // Continue even if deletion fails, as the gist is already empty
      }
    }

    res.status(200).json({
      deleted,
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
    await GistService.deleteGist(id);

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
    const id = firstParam(req.params.id);
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const perPage = req.query.per_page ? parseInt(req.query.per_page as string) : undefined;
    const data = await GistService.getCommits(id, perPage, page);

    const cleanData = data.map((x: IGistCommitItem) => {
      const { user, url, ...rest } = x;
      return rest;
    });

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
    const data = await GistService.getCommit(id, sha);

    const {
      owner,
      history,
      forks,
      user,
      url,
      forks_url,
      commits_url,
      git_pull_url,
      git_push_url,
      html_url,
      comments_url,
      ...rest
    } = data;

    const cleanedFiles = Object.fromEntries(
      Object.entries(rest.files as Record<string, IGistFile>).map(
        ([filename, { raw_url, ...fileWithoutRaw }]) => [filename, fileWithoutRaw],
      ),
    );

    res.status(200).json({
      success: true,
      data: { ...rest, files: cleanedFiles },
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

    const versionsWithChanges: IGistCommitItem[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;

    while (versionsWithChanges.length < limit && hasMore) {
      const commitsBatch = await GistService.getCommits(gistId, batchSize, page);

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
          const version = await GistService.getCommit(gistId, currentCommit.version);
          if (version.files[file]) {
            versionsWithChanges.push(currentCommit);
          }
          continue;
        }

        const lastAddedCommit = versionsWithChanges[versionsWithChanges.length - 1];

        try {
          const [lastVersion, currentVersion] = await Promise.all([
            GistService.getCommit(gistId, lastAddedCommit.version),
            GistService.getCommit(gistId, currentCommit.version),
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

    const versions = versionsWithChanges.map((v: IGistCommitItem) => {
      const { user, url, ...rest } = v;
      return rest;
    });

    res.status(200).json({
      success: true,
      data: versions,
      pagination: {
        cursor: nextCursor,
        hasMore: nextCursor !== null,
        limit,
        count: versions.length,
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
