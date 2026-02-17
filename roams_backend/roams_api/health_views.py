"""
Health check endpoints for monitoring Django service status
"""
from django.http import JsonResponse
from django.db import connection
from django.utils import timezone
import time


def health_check(request):
    """
    Simple health check - returns 200 if Django is responding
    """
    return JsonResponse({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'service': 'roams-django'
    })


def health_check_detailed(request):
    """
    Detailed health check - includes database connectivity test
    """
    start_time = time.time()
    
    # Test database connection
    db_healthy = False
    db_latency = None
    try:
        db_start = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        db_latency = round((time.time() - db_start) * 1000, 2)  # ms
        db_healthy = True
    except Exception as e:
        db_error = str(e)
    
    total_time = round((time.time() - start_time) * 1000, 2)  # ms
    
    response_data = {
        'status': 'healthy' if db_healthy else 'degraded',
        'timestamp': timezone.now().isoformat(),
        'checks': {
            'database': {
                'status': 'ok' if db_healthy else 'error',
                'latency_ms': db_latency
            }
        },
        'response_time_ms': total_time
    }
    
    status_code = 200 if db_healthy else 503
    return JsonResponse(response_data, status=status_code)
