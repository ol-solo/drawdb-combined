import axios from "axios";

export const SHARE_FILENAME = "share.json";
export const VERSION_FILENAME = "versionned.json";

const description = "drawDB diagram";
// Get base URL - use empty string for relative URLs when in combined deployment
const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
const gitlabToken = import.meta.env.VITE_GITLAB_TOKEN;

// Detect if we're using a backend server or calling GitLab directly
// Empty string means we're using the same origin (combined deployment)
const isUsingBackendServer = baseUrl === "" || (baseUrl && !baseUrl.includes("gitlab.com/api/v4"));

function checkBackendUrl() {
  // Allow empty baseUrl for combined deployment (uses relative URLs)
  if (baseUrl === undefined) {
    throw new Error(
      "Backend URL is not configured. Please set VITE_BACKEND_URL environment variable."
    );
  }
}

function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  // Only send token if calling GitLab directly (not through backend)
  if (!isUsingBackendServer && gitlabToken) {
    headers["PRIVATE-TOKEN"] = gitlabToken;
  }
  return headers;
}

// Get the appropriate endpoint path
function getEndpointPath(path) {
  if (isUsingBackendServer) {
    // Backend server uses /gists endpoint (will proxy to GitLab)
    return `/gists${path}`;
  } else {
    // Direct GitLab API uses /snippets endpoint
    return `/snippets${path}`;
  }
}

export async function create(filename, content) {
  checkBackendUrl();
  
  const payload = isUsingBackendServer
    ? {
        // Backend server format (similar to GitHub Gists)
        public: false,
        filename,
        description,
        content,
      }
    : {
        // Direct GitLab API format
        title: description,
        description: description,
        visibility: "private",
        file_name: filename,
        content: content,
      };

  const res = await axios.post(
    `${baseUrl}${getEndpointPath("")}`,
    payload,
    { headers: getHeaders() }
  );

  // Backend server returns { data: { id } }, GitLab returns { id }
  const snippetId = isUsingBackendServer
    ? res.data.data?.id || res.data.id
    : res.data.id;
  
  return snippetId.toString();
}

export async function patch(gistId, filename, content) {
  checkBackendUrl();
  if (content === undefined) {
    // Delete snippet
    await axios.delete(`${baseUrl}${getEndpointPath(`/${gistId}`)}`, {
      headers: getHeaders(),
    });
    return true;
  }
  
  const payload = isUsingBackendServer
    ? {
        // Backend server format
        filename,
        content,
      }
    : {
        // Direct GitLab API format
        title: description,
        description: description,
        file_name: filename,
        content: content,
      };

  const { data } = await axios.patch(
    `${baseUrl}${getEndpointPath(`/${gistId}`)}`,
    payload,
    { headers: getHeaders() }
  );

  return data.deleted || false;
}

export async function del(gistId) {
  checkBackendUrl();
  await axios.delete(`${baseUrl}${getEndpointPath(`/${gistId}`)}`, {
    headers: getHeaders(),
  });
}

export async function get(gistId) {
  checkBackendUrl();
  const res = await axios.get(`${baseUrl}${getEndpointPath(`/${gistId}`)}`, {
    headers: getHeaders(),
  });

  // Backend server should return GitHub Gist-like format
  if (isUsingBackendServer) {
    return res.data;
  }

  // Transform GitLab snippet format to match expected format
  return {
    data: {
      files: {
        [res.data.file_name]: {
          content: res.data.content,
        },
      },
    },
  };
}

export async function getCommits(gistId, perPage = 20, page = 1) {
  checkBackendUrl();
  try {
    const res = await axios.get(
      `${baseUrl}${getEndpointPath(`/${gistId}/commits`)}`,
      {
        headers: getHeaders(),
        params: {
          per_page: perPage,
          page,
        },
      }
    );

    if (isUsingBackendServer) {
      return res.data;
    }

    // GitLab Snippets don't have version history
    // Try versions endpoint, but likely will fail
    try {
      const versionRes = await axios.get(
        `${baseUrl}/snippets/${gistId}/versions`,
        {
          headers: getHeaders(),
          params: {
            per_page: perPage,
            page,
          },
        }
      );
      return versionRes.data.map((version) => ({
        sha: version.id.toString(),
        commit: {
          author: {
            date: version.created_at,
          },
        },
      }));
    } catch (error) {
      return [];
    }
  } catch (error) {
    return [];
  }
}

export async function getVersion(gistId, sha) {
  checkBackendUrl();
  try {
    const res = await axios.get(
      `${baseUrl}${getEndpointPath(`/${gistId}/${sha}`)}`,
      {
        headers: getHeaders(),
      }
    );

    if (isUsingBackendServer) {
      return res.data;
    }

    // Direct GitLab API - try versions endpoint
    try {
      const versionRes = await axios.get(
        `${baseUrl}/snippets/${gistId}/versions/${sha}`,
        {
          headers: getHeaders(),
        }
      );
      return {
        data: {
          files: {
            [versionRes.data.file_name]: {
              content: versionRes.data.content,
            },
          },
        },
      };
    } catch (error) {
      // If version endpoint doesn't exist, return current snippet
      return get(gistId);
    }
  } catch (error) {
    // Fall back to current snippet
    return get(gistId);
  }
}

export async function getCommitsWithFile(
  gistId,
  file,
  limit = 10,
  cursor = null,
) {
  checkBackendUrl();
  try {
    const res = await axios.get(
      `${baseUrl}${getEndpointPath(`/${gistId}/file-versions/${file}`)}`,
      {
        headers: getHeaders(),
        params: {
          limit,
          cursor,
        },
      }
    );

    if (isUsingBackendServer) {
      return res.data;
    }

    // Direct GitLab API - try versions endpoint
    try {
      const versionRes = await axios.get(
        `${baseUrl}/snippets/${gistId}/versions`,
        {
          headers: getHeaders(),
          params: {
            per_page: limit,
            page: cursor ? parseInt(cursor) : 1,
          },
        }
      );
      return {
        data: versionRes.data.map((version) => ({
          sha: version.id.toString(),
          commit: {
            author: {
              date: version.created_at,
            },
          },
        })),
      };
    } catch (error) {
      return { data: [] };
    }
  } catch (error) {
    return { data: [] };
  }
}
