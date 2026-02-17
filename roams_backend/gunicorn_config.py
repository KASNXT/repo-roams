# Gunicorn Configuration for ROAMS Backend
# Path: /opt/roams/roams_backend/gunicorn_config.py

import multiprocessing

# Server Socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker Processes
workers = multiprocessing.cpu_count() * 2 + 1  # Recommended formula
worker_class = "sync"  # Use 'gevent' or 'eventlet' for async if needed
worker_connections = 1000
timeout = 120  # 2 minutes for OPC UA operations
keepalive = 5

# Process Naming
proc_name = "roams_django"

# Logging
accesslog = "/var/log/roams/gunicorn-access.log"
errorlog = "/var/log/roams/gunicorn-error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process Management
daemon = False  # Systemd manages this
pidfile = "/var/run/roams/gunicorn.pid"
umask = 0o007
user = None  # Set by systemd
group = None  # Set by systemd

# Server Mechanics
preload_app = True  # Load application before forking workers
reload = False  # Don't auto-reload in production
max_requests = 1000  # Restart workers after this many requests (prevents memory leaks)
max_requests_jitter = 50  # Add randomness to prevent all workers restarting at once

# SSL (if using HTTPS directly, but Nginx handles this)
# keyfile = '/path/to/key.pem'
# certfile = '/path/to/cert.pem'
