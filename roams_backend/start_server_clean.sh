#!/bin/bash
# Clean server startup script

cd "$(dirname "$0")"

# Stop any existing servers
echo "🛑 Stopping any existing Django servers..."
pkill -9 -f "python manage.py runserver" 2>/dev/null
sleep 2

# Activate virtual environment
source venv_new/bin/activate

# Start fresh server
echo "🚀 Starting Django server..."
echo "📋 Logs will appear below. Press Ctrl+C to stop."
echo "=" 
echo ""

python manage.py runserver 0.0.0.0:8000 --nothreading --noreload
