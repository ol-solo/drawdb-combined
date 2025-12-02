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
- `SERVER_NAME` - Domain name for Nginx (e.g., `mycompany.com`). Defaults to `_` (accepts any domain). Set this for better security when using SSL certificates.
- `GITHUB_TOKEN` - Only needed if you want to use the sharing feature
- `MAIL_*` - Only needed if you want to use email features
- `CLIENT_URLS` - Only needed for CORS configuration
- `HTTP_PROXY` / `HTTPS_PROXY` - Only needed if behind a proxy

### 2. SSL Certificates (Optional)

If you want HTTPS, place your certificates in the `ssl/` directory:

```bash
# Your own certificates (rename .crt/.key to .pem)
cp mycompany.com.crt ssl/cert.pem
cp mycompany.com.key ssl/key.pem

# Set proper permissions
chmod 644 ssl/cert.pem
chmod 600 ssl/key.pem
```

**Important:** Also set `SERVER_NAME=mycompany.com` in your `.env` file to restrict Nginx to your domain for better security.

If SSL certificates are not provided, the application will run on HTTP (port 80).

## Security

⚠️ **Important:** The `.env` file contains sensitive information and is excluded from git. Never commit it!

