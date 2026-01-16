import { config } from '../config';

const gitlabConfig = config.api.gitlab;

if (!gitlabConfig.token) {
  throw new Error('GITLAB_TOKEN is required');
}

if (!gitlabConfig.projectId) {
  throw new Error('GITLAB_PROJECT_ID is required');
}

export const gitlabBaseUrl = `${gitlabConfig.baseUrl}/api/v4`;
export const projectId = gitlabConfig.projectId;
export const defaultRef = gitlabConfig.ref;
export const sharesPathPrefix = gitlabConfig.sharesPathPrefix;

export const headers = {
  'PRIVATE-TOKEN': gitlabConfig.token,
  'Content-Type': 'application/json',
};
