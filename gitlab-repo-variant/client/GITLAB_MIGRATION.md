# GitLab Migration Guide

This guide explains how to migrate the drawDB sharing feature from GitHub Gists to GitLab Snippets.

## Frontend Changes (Already Done)

The frontend has been updated to support both:
1. **Backend Server Mode**: When `VITE_BACKEND_URL` points to your backend server
2. **Direct GitLab API Mode**: When `VITE_BACKEND_URL` points to `https://gitlab.com/api/v4`

The frontend automatically detects which mode to use based on the `VITE_BACKEND_URL` value.

## Backend Server Updates Required

If you're using the `drawdb-server` backend, you need to update it to proxy GitLab Snippets API instead of GitHub Gists API.

### 1. Update Environment Variables

In your backend server's `.env` file, change from:
```env
GITHUB_TOKEN=your_github_token
```

To:
```env
GITLAB_TOKEN=your_gitlab_personal_access_token
GITLAB_API_URL=https://gitlab.com/api/v4
# For self-hosted GitLab:
# GITLAB_API_URL=https://gitlab.yourcompany.com/api/v4
```

### 2. Update API Endpoints

Change your backend endpoints from GitHub Gists to GitLab Snippets:

**GitHub Gists API (old):**
- `POST /gists` → `POST https://api.github.com/gists`
- `GET /gists/:id` → `GET https://api.github.com/gists/:id`
- `PATCH /gists/:id` → `PATCH https://api.github.com/gists/:id`
- `DELETE /gists/:id` → `DELETE https://api.github.com/gists/:id`

**GitLab Snippets API (new):**
- `POST /gists` → `POST https://gitlab.com/api/v4/snippets`
- `GET /gists/:id` → `GET https://gitlab.com/api/v4/snippets/:id`
- `PATCH /gists/:id` → `PUT https://gitlab.com/api/v4/snippets/:id`
- `DELETE /gists/:id` → `DELETE https://gitlab.com/api/v4/snippets/:id`

### 3. Update Request/Response Format

**Request Format Changes:**

GitHub Gists format:
```json
{
  "public": false,
  "filename": "share.json",
  "description": "drawDB diagram",
  "content": "..."
}
```

GitLab Snippets format:
```json
{
  "title": "drawDB diagram",
  "description": "drawDB diagram",
  "visibility": "private",
  "file_name": "share.json",
  "content": "..."
}
```

**Response Format Changes:**

GitHub Gists response:
```json
{
  "data": {
    "id": "123",
    "files": {
      "share.json": {
        "content": "..."
      }
    }
  }
}
```

GitLab Snippets response (transform to match):
```json
{
  "data": {
    "id": "123",
    "files": {
      "share.json": {
        "content": "..."
      }
    }
  }
}
```

### 4. Update Authentication

Change from GitHub token header:
```javascript
headers: {
  'Authorization': `token ${githubToken}`
}
```

To GitLab token header:
```javascript
headers: {
  'PRIVATE-TOKEN': gitlabToken
}
```

### 5. Example Backend Implementation (Node.js/Express)

```javascript
const axios = require('axios');

const GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;

const gitlabHeaders = {
  'PRIVATE-TOKEN': GITLAB_TOKEN,
  'Content-Type': 'application/json'
};

// Create snippet
app.post('/gists', async (req, res) => {
  try {
    const { filename, description, content } = req.body;
    
    const response = await axios.post(
      `${GITLAB_API_URL}/snippets`,
      {
        title: description,
        description: description,
        visibility: 'private',
        file_name: filename,
        content: content
      },
      { headers: gitlabHeaders }
    );

    // Transform to match expected format
    res.json({
      data: {
        id: response.data.id.toString(),
        files: {
          [filename]: {
            content: response.data.content
          }
        }
      }
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Get snippet
app.get('/gists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(
      `${GITLAB_API_URL}/snippets/${id}`,
      { headers: gitlabHeaders }
    );

    // Transform to match expected format
    res.json({
      data: {
        id: response.data.id.toString(),
        files: {
          [response.data.file_name]: {
            content: response.data.content
          }
        }
      }
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Update snippet
app.patch('/gists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { filename, content } = req.body;

    if (content === undefined) {
      // Delete snippet
      await axios.delete(
        `${GITLAB_API_URL}/snippets/${id}`,
        { headers: gitlabHeaders }
      );
      return res.json({ deleted: true });
    }

    const response = await axios.put(
      `${GITLAB_API_URL}/snippets/${id}`,
      {
        title: 'drawDB diagram',
        description: 'drawDB diagram',
        file_name: filename,
        content: content
      },
      { headers: gitlabHeaders }
    );

    res.json({ deleted: false });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Delete snippet
app.delete('/gists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await axios.delete(
      `${GITLAB_API_URL}/snippets/${id}`,
      { headers: gitlabHeaders }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});
```

### 6. Version History (Optional)

GitLab Snippets don't support version history like GitHub Gists. The version-related endpoints (`/gists/:id/commits`, `/gists/:id/:sha`, etc.) should return empty arrays or the current snippet content.

### 7. Testing

After updating your backend:
1. Set `VITE_BACKEND_URL` in frontend to your backend server URL
2. Restart both frontend and backend servers
3. Test sharing functionality

## Direct GitLab API (No Backend)

If you prefer to call GitLab API directly from the frontend (less secure, exposes token):

```env
VITE_BACKEND_URL=https://gitlab.com/api/v4
VITE_GITLAB_TOKEN=your_gitlab_token
```

**Note**: This exposes your GitLab token in the frontend code. Use backend server mode for production.

## Getting a GitLab Personal Access Token

1. Go to GitLab → Settings → Access Tokens
2. Create a token with `api` scope
3. Copy the token and add it to your backend `.env` file

