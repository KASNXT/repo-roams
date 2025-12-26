"""
Dashboard and analytics service for threshold breaches.
Provides metrics and trends for breach visualization.
"""

import logging
from django.utils.timezone import now, timedelta
from django.apps import apps
from django.db.models import Count, Q, Avg, Max, Min
from datetime import datetime, date

logger = logging.getLogger(__name__)


def get_top_breached_parameters(station=None, hours=24, limit=10):
    """
    Get the top parameters with most breaches.
    
    Args:
        station: Optional station to filter by
        hours: Look back this many hours
        limit: Number of top parameters to return
    
    Returns:
        List of dicts with parameter name and breach count
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        OPCUANode = apps.get_model("roams_opcua_mgr", "OPCUANode")
        
        cutoff = now() - timedelta(hours=hours)
        
        query = ThresholdBreach.objects.filter(timestamp__gte=cutoff)
        
        if station:
            query = query.filter(node__client_config__station_name=station)
        
        breaches = query.values('node__tag_name', 'node__tag_units', 'node__id').annotate(
            count=Count('id'),
            critical_count=Count('id', filter=Q(level='Critical')),
            warning_count=Count('id', filter=Q(level='Warning')),
            last_breach=Max('timestamp')
        ).order_by('-count')[:limit]
        
        return list(breaches)
        
    except Exception as e:
        logger.error(f"Error getting top breached parameters: {e}")
        return []


def get_breach_statistics(station=None, hours=24):
    """
    Get overall breach statistics.
    
    Args:
        station: Optional station to filter by
        hours: Look back this many hours
    
    Returns:
        Dict with various statistics
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        
        cutoff = now() - timedelta(hours=hours)
        
        query = ThresholdBreach.objects.filter(timestamp__gte=cutoff)
        
        if station:
            query = query.filter(node__client_config__station_name=station)
        
        stats = {
            'total_breaches': query.count(),
            'critical_breaches': query.filter(level='Critical').count(),
            'warning_breaches': query.filter(level='Warning').count(),
            'unacknowledged_breaches': query.filter(acknowledged=False).count(),
            'acknowledged_breaches': query.filter(acknowledged=True).count(),
            'affected_parameters': query.values('node_id').distinct().count(),
            'affected_stations': query.values('node__client_config_id').distinct().count(),
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting breach statistics: {e}")
        return {}


def get_breach_trend(hours=24, interval_minutes=60):
    """
    Get breach trend data for time-series visualization.
    
    Args:
        hours: Look back this many hours
        interval_minutes: Bucket breaches into time intervals
    
    Returns:
        List of dicts with timestamp and breach counts
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        from django.db.models.functions import TruncMinute
        from django.db.models import Count, Q
        
        cutoff = now() - timedelta(hours=hours)
        
        breaches = (
            ThresholdBreach.objects
            .filter(timestamp__gte=cutoff)
            .annotate(time_bucket=TruncMinute('timestamp', interval=interval_minutes))
            .values('time_bucket')
            .annotate(
                total=Count('id'),
                critical=Count('id', filter=Q(level='Critical')),
                warning=Count('id', filter=Q(level='Warning'))
            )
            .order_by('time_bucket')
        )
        
        return list(breaches)
        
    except Exception as e:
        logger.error(f"Error getting breach trend: {e}")
        return []


def get_breach_severity_distribution(station=None, hours=24):
    """
    Get distribution of breaches by severity level.
    
    Args:
        station: Optional station to filter by
        hours: Look back this many hours
    
    Returns:
        Dict with severity breakdown
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        
        cutoff = now() - timedelta(hours=hours)
        
        query = ThresholdBreach.objects.filter(timestamp__gte=cutoff)
        
        if station:
            query = query.filter(node__client_config__station_name=station)
        
        distribution = query.values('level').annotate(count=Count('id')).order_by('level')
        
        return {item['level']: item['count'] for item in distribution}
        
    except Exception as e:
        logger.error(f"Error getting severity distribution: {e}")
        return {}


def get_unacknowledged_critical_breaches():
    """
    Get all unacknowledged critical breaches (most urgent).
    
    Returns:
        QuerySet of unacknowledged critical breaches, ordered by recency
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        
        return ThresholdBreach.objects.filter(
            acknowledged=False,
            level='Critical'
        ).select_related(
            'node',
            'node__client_config',
            'node__tag_name'
        ).order_by('-timestamp')
        
    except Exception as e:
        logger.error(f"Error getting unacknowledged critical breaches: {e}")
        return []


def get_parameter_breach_history(node_id, days=30):
    """
    Get breach history for a specific parameter.
    
    Args:
        node_id: OPCUANode ID
        days: Look back this many days
    
    Returns:
        QuerySet of breaches for this node
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        
        cutoff = now() - timedelta(days=days)
        
        return ThresholdBreach.objects.filter(
            node_id=node_id,
            timestamp__gte=cutoff
        ).select_related(
            'node',
            'node__client_config'
        ).order_by('-timestamp')
        
    except Exception as e:
        logger.error(f"Error getting parameter breach history: {e}")
        return []


def get_daily_breach_report(date_=None):
    """
    Generate daily breach report for a specific date.
    
    Args:
        date_: datetime.date object (defaults to today)
    
    Returns:
        Dict with daily statistics
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        
        if date_ is None:
            date_ = date.today()
        
        start = datetime.combine(date_, datetime.min.time())
        end = datetime.combine(date_, datetime.max.time())
        
        breaches = ThresholdBreach.objects.filter(
            timestamp__gte=start,
            timestamp__lte=end
        )
        
        report = {
            'date': date_.isoformat(),
            'total_breaches': breaches.count(),
            'critical_breaches': breaches.filter(level='Critical').count(),
            'warning_breaches': breaches.filter(level='Warning').count(),
            'acknowledged': breaches.filter(acknowledged=True).count(),
            'unacknowledged': breaches.filter(acknowledged=False).count(),
            'affected_parameters': breaches.values('node_id').distinct().count(),
            'top_parameters': list(
                breaches.values('node__tag_name')
                .annotate(count=Count('id'))
                .order_by('-count')[:5]
            )
        }
        
        return report
        
    except Exception as e:
        logger.error(f"Error generating daily breach report: {e}")
        return {}


def get_breach_frequency_trend(parameter_id, days=90):
    """
    Analyze breach frequency trend for a parameter.
    Shows if breaches are increasing or decreasing.
    
    Args:
        parameter_id: OPCUANode ID
        days: Look back this many days
    
    Returns:
        Dict with trend analysis
    """
    try:
        ThresholdBreach = apps.get_model("roams_opcua_mgr", "ThresholdBreach")
        from django.db.models.functions import TruncDay
        
        cutoff = now() - timedelta(days=days)
        
        daily_counts = (
            ThresholdBreach.objects
            .filter(
                node_id=parameter_id,
                timestamp__gte=cutoff
            )
            .annotate(day=TruncDay('timestamp'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        
        counts = [item['count'] for item in daily_counts]
        
        if len(counts) < 2:
            trend = "insufficient_data"
            percent_change = 0
        else:
            first_half_avg = sum(counts[:len(counts)//2]) / max(len(counts)//2, 1)
            second_half_avg = sum(counts[len(counts)//2:]) / max(len(counts) - len(counts)//2, 1)
            
            if first_half_avg == 0:
                percent_change = 100 if second_half_avg > 0 else 0
                trend = "increasing" if second_half_avg > 0 else "stable"
            else:
                percent_change = ((second_half_avg - first_half_avg) / first_half_avg) * 100
                if percent_change > 10:
                    trend = "increasing"
                elif percent_change < -10:
                    trend = "decreasing"
                else:
                    trend = "stable"
        
        return {
            'trend': trend,
            'percent_change': round(percent_change, 2),
            'daily_data': list(daily_counts)
        }
        
    except Exception as e:
        logger.error(f"Error analyzing breach frequency trend: {e}")
        return {}
