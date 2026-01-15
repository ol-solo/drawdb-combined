#!/bin/sh
# Generate nginx config conditionally based on SSL certificate availability

NGINX_CONF="/tmp/nginx.conf"
NGINX_CONF_FINAL="/etc/nginx/nginx.conf"
SSL_CERT="/etc/nginx/ssl/cert.pem"
SSL_KEY="/etc/nginx/ssl/key.pem"

# Get server name from environment (default to _ if not set)
SERVER_NAME="${SERVER_NAME:-_}"

# Check if SSL certificates exist
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo "SSL certificates found - enabling HTTPS"
    # Use full config with HTTPS
    cp /etc/nginx/nginx.conf.full "$NGINX_CONF"
    # Replace server_name placeholder with actual domain
    sed -i "s/server_name _;/server_name $SERVER_NAME;/g" "$NGINX_CONF"
else
    echo "No SSL certificates found - HTTP only mode"
    # Create HTTP-only config
    cat > "$NGINX_CONF" << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    upstream drawdb_backend {
        server localhost:5000;
    }

    server {
        listen 80;
        server_name $SERVER_NAME;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        location / {
            proxy_pass http://drawdb_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://drawdb_backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
fi

# Copy generated config to final location (if not mounted)
if [ ! -f "$NGINX_CONF_FINAL" ] || [ ! -L "$NGINX_CONF_FINAL" ]; then
    cp "$NGINX_CONF" "$NGINX_CONF_FINAL"
fi

# Test nginx config
nginx -t

