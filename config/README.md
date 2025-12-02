# Configuration Directory

This directory contains all configuration files for DrawDB.

## Files

- `.env` - Environment variables (create this from `.env.example`)
- `ssl/` - SSL certificates directory (optional)

## Setup

### 1. Environment Variables

Copy the example file and configure:

```bash
cp .env.example .env
nano .env
```

**Required:**
- None! All variables are optional.

**Optional:**
- `GITHUB_TOKEN` - Only needed if you want to use the sharing feature
- `MAIL_*` - Only needed if you want to use email features
- `CLIENT_URLS` - Only needed for CORS configuration
- `HTTP_PROXY` / `HTTPS_PROXY` - Only needed if behind a proxy

### 2. SSL Certificates (Optional)

If you want HTTPS, place your certificates in the `ssl/` directory:

```bash
# Your own certificates
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem

# Or use Let's Encrypt (mount the directory in docker-compose.yml)
```

If SSL certificates are not provided, the application will run on HTTP (port 80).

## Security

⚠️ **Important:** The `.env` file contains sensitive information and is excluded from git. Never commit it!

