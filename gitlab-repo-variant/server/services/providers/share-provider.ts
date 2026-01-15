export type ShareFilesMap = Record<
  string,
  {
    filename: string;
    content: string;
  }
>;

export type ShareGetResult = {
  id: string;
  files: ShareFilesMap;
};

export type ShareCommitItem = {
  version: string;
  committed_at: string;
};

export type ShareFileVersionsResult = {
  versions: ShareCommitItem[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  count: number;
};

export interface ShareProvider {
  createShareFile(params: { filename: string; content: string; description?: string }): Promise<{
    id: string;
    files: ShareFilesMap;
  }>;

  upsertShareFile(params: { id: string; filename: string; content: string }): Promise<void>;

  getShare(params: { id: string; ref?: string }): Promise<ShareGetResult>;

  deleteShare(params: { id: string }): Promise<void>;

  listCommits(params: { id: string; perPage?: number; page?: number }): Promise<ShareCommitItem[]>;

  listFileCommits(params: {
    id: string;
    filename: string;
    perPage?: number;
    page?: number;
  }): Promise<ShareCommitItem[]>;

  getFileContentAtRef(params: {
    id: string;
    filename: string;
    ref: string;
  }): Promise<string | null>;
}

