# Nginx Configuration for DrawDB Production

## SSL Certificates Setup

### Option 1: Use Your Own Certificates

1. Place your SSL certificate and key in the `nginx/ssl/` directory:
   - `cert.pem` - Your SSL certificate
   - `key.pem` - Your private key

2. Update the file paths in `nginx.conf` if needed.

### Option 2: Use Let's Encrypt (Recommended)

1. Install certbot on your host machine:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot
   ```

2. Get certificates:
   ```bash
   sudo certbot certonly --standalone -d mycompany.com -d www.mycompany.com
   ```

3. Update `docker-compose.prod.yml` to mount Let's Encrypt directory:
   ```yaml
   volumes:
     - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

4. Update `nginx.conf` to use Let's Encrypt paths:
   ```nginx
   ssl_certificate /etc/letsencrypt/live/mycompany.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/mycompany.com/privkey.pem;
   ```

## Configuration

1. Update `nginx.conf`:
   - Replace `mycompany.com` with your actual domain
   - Update SSL certificate paths if needed

2. Update `.env.prod`:
   - Set your GitHub token
   - Configure proxy settings if needed
   - Update CLIENT_URLS with your domain

## Deployment

```bash
# Build and start
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop
docker compose -f docker-compose.prod.yml down
```

