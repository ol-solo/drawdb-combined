import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  dev: process.env.NODE_ENV === 'dev',
  api: {
    github: process.env.GITHUB_TOKEN,
    gitlab: {
      baseUrl: process.env.GITLAB_BASE_URL || '',
      token: process.env.GITLAB_TOKEN || '',
      projectId: process.env.GITLAB_PROJECT_ID || '',
      ref: process.env.GITLAB_REF || 'main',
      sharesPathPrefix: process.env.GITLAB_SHARES_PATH_PREFIX || 'shares',
    },
  },
  share: {
    provider: process.env.SHARE_PROVIDER || 'auto',
  },
  server: {
    port: Number(process.env.PORT) || 5000,
    allowedOrigins: process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(',') : [],
  },
  mail: {
    service: process.env.MAIL_SERVICE || 'gmail',
    username: process.env.MAIL_USERNAME || '',
    password: process.env.MAIL_PASSWORD || '',
  },
};
