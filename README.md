# DrawDB Combined

A unified single-container setup for DrawDB with nginx reverse proxy.

## Features

- ✅ Single Dockerfile and docker-compose.yml
- ✅ Nginx and application in one container
- ✅ Optional SSL/HTTPS support
- ✅ Optional GitLab Project Repository (recommended) or GitHub token (sharing/versioning)
- ✅ Optional proxy support
- ✅ Automatic restart on failure
- ✅ All configuration in one place (`config/` directory)

## Quick Start

### 1. Setup Configuration

```bash
# Copy example environment file
cp config/.env.example config/.env

# Edit if needed (all variables are optional)
nano config/.env
```

### 2. SSL Certificates (Optional)

If you want HTTPS, place certificates in `config/ssl/`:

```bash
# Copy your certificates (rename .crt/.key to .pem)
cp mycompany.com.crt config/ssl/cert.pem
cp mycompany.com.key config/ssl/key.pem

# Set proper permissions
chmod 644 config/ssl/cert.pem
chmod 600 config/ssl/key.pem
```

**Important:** Set `SERVER_NAME=mycompany.com` in `config/.env` to restrict Nginx to your domain for better security.

If no certificates are provided, the app runs on HTTP (port 80).

### 3. Build and Run

```bash
docker compose up -d --build
```

### 4. Access

- **HTTP**: http://localhost (or your domain)
- **HTTPS**: https://localhost (if SSL certificates are provided)
- **Direct app**: http://localhost:5000

## Configuration

All configuration is in the `config/` directory:

- `config/.env` - Environment variables (create from `.env.example`)
- `config/ssl/` - SSL certificates (optional)

### Environment Variables (all optional)

```bash
# Server name for Nginx (recommended when using SSL)
# Set to your domain name for better security
SERVER_NAME=mycompany.com

# Sharing provider (optional)
# SHARE_PROVIDER=auto

# GitLab Project Repository (recommended for sharing/versioning)
# GITLAB_BASE_URL=https://gitlab.com
# GITLAB_TOKEN=your_gitlab_token_here
# GITLAB_PROJECT_ID=123456
# GITLAB_REF=main
# GITLAB_SHARES_PATH_PREFIX=shares

# GitHub token (optional fallback)
# GITHUB_TOKEN=your_token_here

# Email (only if you need email features)
MAIL_SERVICE=gmail
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# CORS origins
CLIENT_URLS=https://mycompany.com

# Proxy (only if behind proxy)
HTTP_PROXY=http://proxy.example.com:443
HTTPS_PROXY=http://proxy.example.com:443
```

### GitLab shares repository bootstrap (optional)

If you want the share/version feature backed by a dedicated GitLab project repository, create a project (e.g. `drawdb-shares`) and set `GITLAB_PROJECT_ID`.

You can also create it via the included helper script:

```bash
cd server
GITLAB_BASE_URL=https://gitlab.com GITLAB_TOKEN=... npx ts-node utils/create-gitlab-shares-project.ts
```

## Ports

- **80** - HTTP (redirects to HTTPS if SSL is configured)
- **443** - HTTPS (only works if SSL certificates are provided)
- **5000** - Direct application access (optional)

You can customize ports via environment variables:

```bash
HTTP_PORT=8080 HTTPS_PORT=8443 APP_PORT=5000 docker compose up
```

## Production Deployment

1. Place SSL certificates in `config/ssl/`:
   ```bash
   cp mycompany.com.crt config/ssl/cert.pem
   cp mycompany.com.key config/ssl/key.pem
   chmod 644 config/ssl/cert.pem
   chmod 600 config/ssl/key.pem
   ```

2. Configure `config/.env` with your settings:
   ```bash
   SERVER_NAME=mycompany.com
   # SHARE_PROVIDER=gitlab-repo
   # GITLAB_BASE_URL=https://gitlab.com
   # GITLAB_TOKEN=your_gitlab_token_here
   # GITLAB_PROJECT_ID=123456
   # ... other settings
   ```

3. Run: `docker compose up -d --build`

4. Configure DNS: Point `mycompany.com` A record to your server's IP address

5. Access: `https://mycompany.com`

## Architecture

- **Single container** runs both nginx and the Node.js application
- **Supervisor** manages both processes
- **Nginx** handles SSL termination and reverse proxy
- **Node.js** serves the application on port 5000 (internal)

## Troubleshooting

### Check logs
```bash
docker compose logs -f
```

### Check container status
```bash
docker compose ps
```

### Restart services
```bash
docker compose restart
```

### SSL not working?
- Verify certificates are in `config/ssl/`
- Check file permissions
- Verify certificate format (PEM)

### Proxy not working?
- Check proxy settings in `config/.env`
- Verify proxy URL and port
- Test connectivity from container

## File Structure

```
drawdb-combined/
├── config/              # All configuration
│   ├── .env            # Environment variables (create from .env.example)
│   ├── .env.example    # Example environment file
│   └── ssl/            # SSL certificates (optional)
│       ├── cert.pem
│       └── key.pem
├── nginx/
│   └── nginx.conf      # Nginx configuration
├── Dockerfile          # Single unified Dockerfile
├── docker-compose.yml  # Single unified docker-compose
└── README.md           # This file
```
