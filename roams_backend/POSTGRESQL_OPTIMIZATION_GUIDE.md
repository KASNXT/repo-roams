# PostgreSQL Query Performance Optimization Guide
# Add these settings to your PostgreSQL connection or postgresql.conf

# For Django settings.py, add to your DATABASES config:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_db_name',
        'USER': 'your_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
        'CONN_MAX_AGE': 600,
        'OPTIONS': {        ip route del 192.168.2.0/24
        ip route del 192.168.3.0/24        ip route del 192.168.2.0/24
        ip route del 192.168.3.0/24
            'connect_timeout': 10,
            'statement_timeout': 300000,  # 5 minutes in milliseconds
            'options': '-c statement_timeout=300000'
        }
    }
}

# Alternative: Set in postgresql.conf or in your queries
# SET statement_timeout = '5min';
# SET work_mem = '256MB';
# SET shared_buffers = '256MB';

# Recommended settings for deletion operations:
# 1. Increase maintenance_work_mem for faster operations
# 2. Increase statement_timeout for large operations
# 3. Use VACUUM after bulk deletes to reclaim space
