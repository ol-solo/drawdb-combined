export interface IGistCommitItem {
  user: unknown;
  version: string;
  commited_at: string;
  change_status: {
    total: number;
    additions: number;
    deletions: number;
  };
  url: string;
}
