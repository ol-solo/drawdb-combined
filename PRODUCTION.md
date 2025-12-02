# Production Deployment Guide

This guide covers deploying DrawDB in a production environment with nginx reverse proxy on port 443.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured (e.g., mycompany.com)
- SSL certificates (or use Let's Encrypt)
- Port 443 available on the VM

## Quick Start

### 1. Configure Environment

Edit `.env.prod` in the parent directory:
```bash
cd /Users/admin/Python/drawdballinone
nano .env.prod
```

Update:
- `GITHUB_TOKEN` - Your GitHub personal access token
- `CLIENT_URLS` - Your domain (https://mycompany.com)
- `HTTP_PROXY` / `HTTPS_PROXY` - If you need proxy for internet access

### 2. Setup SSL Certificates

#### Option A: Your Own Certificates
```bash
# Place certificates in nginx/ssl/
cp your-cert.pem drawdb-combined/nginx/ssl/cert.pem
cp your-key.pem drawdb-combined/nginx/ssl/key.pem
```

#### Option B: Let's Encrypt
```bash
# Install certbot
sudo apt-get install certbot

# Get certificates
sudo certbot certonly --standalone -d mycompany.com -d www.mycompany.com

# Update docker-compose.prod.yml to mount /etc/letsencrypt
```

### 3. Update Nginx Configuration

Edit `nginx/nginx.conf`:
- Replace `mycompany.com` with your actual domain
- Update SSL certificate paths if using Let's Encrypt

### 4. Build and Deploy

```bash
cd drawdb-combined

# Build and start services
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Verify

- Access your application: https://mycompany.com
- Check health: https://mycompany.com/health
- Verify SSL: https://www.ssllabs.com/ssltest/

## Proxy Configuration

If your VM requires a proxy to access the internet:

1. Set proxy in `.env.prod`:
   ```
   HTTP_PROXY=http://proxy.example.com:8080
   HTTPS_PROXY=http://proxy.example.com:8080
   ```

2. The container will use these for:
   - GitHub API calls (gist operations)
   - Email sending (if configured)
   - Any external API calls

## Maintenance

### Update Application
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f drawdb-app
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services
```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop Services
```bash
docker compose -f docker-compose.prod.yml down
```

## Troubleshooting

### SSL Certificate Issues
- Verify certificate files exist and are readable
- Check certificate expiration: `openssl x509 -in cert.pem -noout -dates`
- Ensure nginx has read permissions

### Proxy Issues
- Test proxy connectivity from container:
  ```bash
  docker compose -f docker-compose.prod.yml exec drawdb-app curl -v https://api.github.com
  ```

### Port Conflicts
- Ensure port 443 is not in use: `sudo lsof -i :443`
- Check nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`

### Application Not Accessible
- Check container status: `docker compose -f docker-compose.prod.yml ps`
- Verify nginx is proxying correctly: `docker compose -f docker-compose.prod.yml logs nginx`
- Test internal connection: `docker compose -f docker-compose.prod.yml exec nginx wget -O- http://drawdb-app:5000/health`

## Security Notes

1. Keep SSL certificates secure
2. Regularly update Docker images
3. Use strong GitHub token with minimal permissions
4. Monitor logs for suspicious activity
5. Keep `.env.prod` file secure (don't commit to git)

## File Structure

```
drawdb-combined/
├── Dockerfile.prod          # Production Dockerfile
├── docker-compose.prod.yml  # Production compose file
├── nginx/
│   ├── nginx.conf          # Nginx configuration
│   ├── ssl/                # SSL certificates directory
│   └── README.md           # Nginx setup guide
└── PRODUCTION.md           # This file

../.env.prod                # Production environment variables
```

