"""
Server Uptime Trend Analysis
Tracks how long the Django server (and stations) have been running.
"""

from datetime import timedelta, datetime
from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncHour, TruncDay
import logging

logger = logging.getLogger(__name__)


def get_django_server_uptime():
    """
    Get Django server uptime duration.
    This tracks how long the server process has been running.
    
    Returns:
        dict with uptime information
    """
    from django.core.cache import cache
    from roams_opcua_mgr.logging_model import OpcUaReadLog
    
    # Get the earliest read log as server start time
    earliest_log = OpcUaReadLog.objects.earliest('timestamp') if OpcUaReadLog.objects.exists() else None
    
    if earliest_log:
        server_start = earliest_log.timestamp
        server_uptime = timezone.now() - server_start
        
        days = server_uptime.days
        hours = server_uptime.seconds // 3600
        minutes = (server_uptime.seconds % 3600) // 60
        
        return {
            'status': 'running',
            'start_time': server_start.isoformat(),
            'current_time': timezone.now().isoformat(),
            'uptime_seconds': int(server_uptime.total_seconds()),
            'uptime_formatted': f"{days}d {hours}h {minutes}m",
            'days': days,
            'hours': hours,
            'minutes': minutes,
        }
    else:
        return {
            'status': 'unknown',
            'message': 'No data collected yet',
        }


def get_uptime_trend_hourly(hours=24):
    """
    Get hourly uptime trend for the past N hours.
    Shows uptime % for each station in hourly buckets.
    
    Args:
        hours: Number of hours to look back
    
    Returns:
        List of dicts with timestamp and per-station uptime percentages
    """
    from roams_opcua_mgr.models import OpcUaClientConfig
    from roams_opcua_mgr.logging_model import OpcUaReadLog
    
    try:
        cutoff = timezone.now() - timedelta(hours=hours)
        
        # Get all stations
        stations = OpcUaClientConfig.objects.all()
        
        # Get hourly buckets of read logs
        logs = (
            OpcUaReadLog.objects
            .filter(timestamp__gte=cutoff)
            .annotate(hour=TruncHour('timestamp'))
            .values('hour', 'client_config__station_name')
            .annotate(count=Count('id'))
            .order_by('hour', 'client_config__station_name')
        )
        
        # Build trend data structure
        trend_data = {}
        for log in logs:
            hour = log['hour']
            station = log['client_config__station_name']
            count = log['count']
            
            if hour not in trend_data:
                trend_data[hour] = {'timestamp': hour.isoformat()}
            
            trend_data[hour][station] = count
        
        # Calculate uptime percentages for each hour
        result = []
        for timestamp in sorted(trend_data.keys()):
            entry = trend_data[timestamp]
            entry['timestamp'] = timestamp.isoformat()
            
            # Add a numeric timestamp for sorting
            entry['ts'] = int(timestamp.timestamp() * 1000)
            
            result.append(entry)
        
        return result
    
    except Exception as e:
        logger.error(f"Error calculating hourly uptime trend: {str(e)}")
        return []


def get_uptime_trend_daily(days=30):
    """
    Get daily uptime trend for the past N days.
    Shows uptime % for each station per day.
    
    Args:
        days: Number of days to look back
    
    Returns:
        List of dicts with date and per-station uptime percentages
    """
    from roams_opcua_mgr.models import OpcUaClientConfig
    from roams_opcua_mgr.logging_model import OpcUaReadLog
    
    try:
        cutoff = timezone.now() - timedelta(days=days)
        
        # Get all stations
        stations = OpcUaClientConfig.objects.all()
        
        # Get daily buckets of read logs
        logs = (
            OpcUaReadLog.objects
            .filter(timestamp__gte=cutoff)
            .annotate(day=TruncDay('timestamp'))
            .values('day', 'client_config__station_name')
            .annotate(count=Count('id'))
            .order_by('day', 'client_config__station_name')
        )
        
        # Build trend data structure
        trend_data = {}
        for log in logs:
            day = log['day']
            station = log['client_config__station_name']
            count = log['count']
            
            if day not in trend_data:
                trend_data[day] = {'timestamp': day.isoformat(), 'date': day.strftime('%Y-%m-%d')}
            
            trend_data[day][station] = count
        
        # Return sorted by date
        result = []
        for timestamp in sorted(trend_data.keys()):
            entry = trend_data[timestamp]
            entry['ts'] = int(timestamp.timestamp() * 1000)
            result.append(entry)
        
        return result
    
    except Exception as e:
        logger.error(f"Error calculating daily uptime trend: {str(e)}")
        return []


def get_combined_uptime_data(hours=24):
    """
    Get comprehensive uptime data combining:
    - Django server uptime
    - Station-specific uptime trends
    - Overall uptime percentage
    
    Args:
        hours: Number of hours for trend data
    
    Returns:
        dict with server status and trend data
    """
    from roams_opcua_mgr.utils.server_uptime import calculate_uptime
    
    try:
        server_uptime = get_django_server_uptime()
        trend = get_uptime_trend_hourly(hours=hours)
        
        # Get current uptime percentages
        uptime_data = calculate_uptime(days=max(1, hours // 24))
        
        if uptime_data:
            overall_uptime = round(sum(uptime_data.values()) / len(uptime_data), 2)
        else:
            overall_uptime = 0
        
        return {
            'server_uptime': server_uptime,
            'overall_uptime': overall_uptime,
            'uptime_by_station': uptime_data,
            'trend': trend,
            'hours': hours,
        }
    
    except Exception as e:
        logger.error(f"Error getting combined uptime data: {str(e)}")
        return {
            'error': str(e),
            'server_uptime': {},
            'overall_uptime': 0,
            'uptime_by_station': {},
            'trend': [],
        }
