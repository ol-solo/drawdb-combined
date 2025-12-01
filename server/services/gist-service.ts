import axios from 'axios';
import { gistsBaseUrl, headers } from '../constants/gist-constants';

export const GistService = {
  deleteGist: async (gistId: string) => {
    await axios.delete(`${gistsBaseUrl}/${gistId}`, {
      headers,
    });
  },

  getCommits: async (gistId: string, perPage?: number, page?: number) => {
    const { data } = await axios.get(`${gistsBaseUrl}/${gistId}/commits`, {
      headers,
      params: {
        per_page: perPage,
        page,
      },
    });

    return data;
  },

  getCommit: async (gistId: string, sha: string) => {
    const { data } = await axios.get(`${gistsBaseUrl}/${gistId}/${sha}`, {
      headers,
    });

    return data;
  },
};
