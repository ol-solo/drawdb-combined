import { config } from '../../config';
import { GithubGistProvider } from './github-gist-provider';
import { GitlabRepoProvider } from './gitlab-repo-provider';
import type { ShareProvider } from './share-provider';

function isGitlabConfigured() {
  return Boolean(config.api.gitlab.baseUrl && config.api.gitlab.token && config.api.gitlab.projectId);
}

export function getShareProvider(): ShareProvider {
  const provider = (config.share?.provider || 'auto').toLowerCase();

  if (provider === 'gitlab' || provider === 'gitlab_repo' || provider === 'gitlab-repo') {
    return new GitlabRepoProvider();
  }

  if (provider === 'github') {
    return new GithubGistProvider();
  }

  // auto
  if (isGitlabConfigured()) {
    return new GitlabRepoProvider();
  }

  return new GithubGistProvider();
}

