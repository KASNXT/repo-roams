#!/bin/bash
# Fix Nginx to handle both port 80 and direct port 8000 requests

ssh root@144.91.79.167 << 'SCRIPT_EOF'

cat > /etc/nginx/sites-enabled/roams << 'NGINX_CONF'
upstream django_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80 default_server;
    server_name 144.91.79.167;

    client_max_body_size 10M;

    # Django routes - must come BEFORE frontend catch-all
    location /admin {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /login {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api-token-auth/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    location /static/ {
        alias /opt/roams_pro/roams_backend/staticfiles/;
    }

    location /health/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
    }

    # Frontend - must be LAST (catch-all)
    location / {
        root /opt/roams_pro/roams_frontend/dist;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX_CONF

# Test configuration
nginx -t || { echo "Nginx config error!"; exit 1; }

# Reload Nginx
systemctl reload nginx
echo "Nginx reloaded successfully"

SCRIPT_EOF
