# server_uptime.py
from datetime import timedelta
from django.utils import timezone



def calculate_uptime(days=30):
    from roams_opcua_mgr.models import OpcUaClientConfig, ConnectionLog
    """
    Calculate station uptime percentage over a given number of days.
    Uses connection logs from ConnectionLog model.
    """
    since = timezone.now() - timedelta(days=days)
    total_duration = timedelta(days=days).total_seconds()
    total_duration = total_duration if total_duration > 0 else 1  # Avoid zero division

    stations = OpcUaClientConfig.objects.all()
    result = {}

    for station in stations:
        logs = (
            ConnectionLog.objects.filter(station=station, timestamp__gte=since)
            .order_by("timestamp")
            .only("status", "timestamp")
        )

        uptime_seconds = 0.0
        last_online = None

        for log in logs:
            if log.status == "online":
                last_online = log.timestamp
            elif log.status == "offline" and last_online:
                uptime_seconds += (log.timestamp - last_online).total_seconds()
                last_online = None

        # If the station is still online at the end
        if last_online:
            uptime_seconds += (timezone.now() - last_online).total_seconds()

        uptime = (uptime_seconds / total_duration) * 100
        result[station.station_name] = round(uptime, 2)

    return result
