# DrawDB Combined

This is a combined single-folder setup that includes both the frontend (client) and backend (server) in one container.

## Folder Structure

```
drawdb-combined/
├── client/              # Frontend React application
│   ├── src/
│   ├── package.json
│   └── ...
├── server/              # Backend Express server
│   ├── src/
│   ├── package.json
│   └── ...
├── Dockerfile           # Combined Dockerfile
├── docker-compose.yml   # Docker Compose configuration
└── README.md            # This file
```

## Quick Start

### Using Docker Compose (Recommended)

1. **Create a `.env` file** in the `drawdb-combined` directory:

```env
PORT=5000
GITHUB_TOKEN=your_github_token_here
MAIL_SERVICE=gmail
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
CLIENT_URLS=http://localhost:5000
```

2. **Build and run:**

```bash
cd drawdb-combined
docker-compose up --build
```

### Using Docker directly

```bash
cd drawdb-combined
docker build -t drawdb-combined .
docker run -p 5000:5000 \
  -e PORT=5000 \
  -e GITHUB_TOKEN=your_token \
  -e MAIL_USERNAME=your_email \
  -e MAIL_PASSWORD=your_password \
  drawdb-combined
```

## Access

Once running, access the application at:
- **Frontend & API**: `http://localhost:5000`
- **API Endpoints**: 
  - `http://localhost:5000/email/*`
  - `http://localhost:5000/gists/*`

The frontend is automatically served by the Express server, and API routes are available at the same origin (no CORS issues).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `GITHUB_TOKEN` | GitHub token for gist operations | Required |
| `MAIL_SERVICE` | Email service provider | `gmail` |
| `MAIL_USERNAME` | Email username | Required |
| `MAIL_PASSWORD` | Email password/app password | Required |
| `CLIENT_URLS` | Comma-separated allowed CORS origins | Optional |

## Development

For development, you can still run frontend and backend separately:

### Frontend (client)
```bash
cd client
npm install
npm run dev
```

### Backend (server)
```bash
cd server
npm install
npm run dev
```

## Production Build

The Dockerfile uses a multi-stage build:
1. Builds the frontend React app
2. Builds the backend TypeScript server
3. Combines both into a single production image

The frontend is built with `VITE_BACKEND_URL=""` to use relative URLs, eliminating CORS issues.

## Notes

- The frontend automatically uses relative URLs when `VITE_BACKEND_URL` is empty
- All API calls go through the same Express server
- Single container deployment simplifies deployment and reduces resource usage

