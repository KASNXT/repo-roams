import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertCircle, AlertTriangle, CheckCircle, Clock, TrendingUp, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchBreaches, type ThresholdBreach } from "@/services/api";
import api from "@/services/api";

interface Notification extends ThresholdBreach {
  node_tag_name?: string;
  station_name?: string;
  message?: string;
  severity?: "High" | "Normal";
}

interface SystemStatus {
  total_alarms: number;
  critical_alarms: number;
  warning_alarms: number;
  acknowledged: number;
  unacknowledged: number;
  last_updated: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "unacknowledged">("all");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch breaches from ThresholdBreach API
      console.log("🔄 Fetching notifications from /api/breaches/");
      const allBreaches = await fetchBreaches(); // Gets all breaches
      console.log("✅ Fetched breaches:", allBreaches);

      if (!allBreaches || allBreaches.length === 0) {
        console.log("⚠️ No breaches returned from API");
        setNotifications([]);
        setStatus({
          total_alarms: 0,
          critical_alarms: 0,
          warning_alarms: 0,
          acknowledged: 0,
          unacknowledged: 0,
          last_updated: new Date().toISOString(),
        });
        return;
      }

      // Determine severity based on level and construct proper message
      const notificationsWithSeverity: Notification[] = allBreaches.map((breach) => ({
        ...breach,
        node_tag_name: breach.node_tag_name || breach.node_name || `Node ${breach.node_id || breach.node}`,
        station_name: breach.station_name || "Unknown Station",
        message: `Value: ${breach.value ?? "N/A"} | Min: ${breach.min_value ?? "N/A"}, Max: ${breach.max_value ?? "N/A"} | Levels: ⚠️ ${breach.warning_level ?? "N/A"} / 🔴 ${breach.critical_level ?? "N/A"}`,
        severity: (breach.level?.toUpperCase() === "CRITICAL" || breach.breach_type?.toUpperCase() === "HIGH") ? "High" : "Normal",
      }));

      // Apply filter
      let filtered = notificationsWithSeverity;
      if (filter === "critical") {
        filtered = notificationsWithSeverity.filter(
          (a) => a.severity === "High"
        );
      } else if (filter === "unacknowledged") {
        filtered = notificationsWithSeverity.filter((a) => !a.acknowledged);
      }

      setNotifications(filtered);

      // Calculate status
      const statusData: SystemStatus = {
        total_alarms: notificationsWithSeverity.length,
        critical_alarms: notificationsWithSeverity.filter(
          (a) => a.severity === "High"
        ).length,
        warning_alarms: notificationsWithSeverity.filter(
          (a) => a.severity === "Normal"
        ).length,
        acknowledged: notificationsWithSeverity.filter((a) => a.acknowledged)
          .length,
        unacknowledged: notificationsWithSeverity.filter(
          (a) => !a.acknowledged
        ).length,
        last_updated: new Date().toISOString(),
      };

      setStatus(statusData);
      console.log("✅ Status updated:", statusData);
    } catch (err) {
      console.error("❌ Error fetching notifications:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to load notifications";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const handleAcknowledge = async (notification: Notification) => {
    try {
      setProcessingId(notification.id);
      await api.post(
        `/breaches/${notification.id}/acknowledge/`,
        {}
      );
      toast.success("✓ Alarm acknowledged");
      fetchNotifications();
    } catch (err) {
      console.error("Failed to acknowledge alarm:", err);
      toast.error("Failed to acknowledge alarm");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (notification: Notification) => {
    try {
      setProcessingId(notification.id);
      await api.post(`/breaches/${notification.id}/dismiss/`, {});
      toast.success("✓ Alarm dismissed");
      fetchNotifications();
    } catch (err) {
      console.error("Failed to dismiss alarm:", err);
      toast.error("Failed to dismiss alarm");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-surface px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Notifications</h1>
                <p className="text-xs text-muted-foreground">System Alerts & Status Updates</p>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 md:p-6 space-y-6">
            {/* Loading State */}
            {loading && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex gap-2 items-center text-blue-700">
                    <Clock className="h-5 w-5 flex-shrink-0 animate-spin" />
                    <p>Loading notifications...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!status && !loading && !error && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex gap-2 items-center text-yellow-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>No status data available. Click Refresh to reload.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Debug Info - Show what we're getting from API */}
            {status && (
              <div className="text-xs text-muted-foreground p-2 bg-gray-100 rounded">
                <p>DEBUG: Total breaches fetched: {status.total_alarms} | Acknowledged: {status.acknowledged} | Unacknowledged: {status.unacknowledged}</p>
              </div>
            )}

            {/* System Status Summary */}
            {status && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                <Card className="transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Total Alarms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-bold">{status.total_alarms}</div>
                    <p className="text-xs text-muted-foreground">All recorded</p>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-red-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium text-red-900 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Critical
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-bold text-red-600">
                      {status.critical_alarms}
                    </div>
                    <p className="text-xs text-red-700">Requires attention</p>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-yellow-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium text-yellow-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-bold text-yellow-600">
                      {status.warning_alarms}
                    </div>
                    <p className="text-xs text-yellow-700">Monitor closely</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-green-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium text-green-900 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Acknowledged
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-bold text-green-600">
                      {status.acknowledged}
                    </div>
                    <p className="text-xs text-green-700">Processed</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer hover:border-orange-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium text-orange-900 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Unacknowledged
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-bold text-orange-600">
                      {status.unacknowledged}
                    </div>
                    <p className="text-xs text-orange-700">Action needed</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">
                Filter:
              </span>
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="text-xs md:text-sm"
              >
                All Alarms
              </Button>
              <Button
                variant={filter === "critical" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("critical")}
                className="text-xs md:text-sm"
              >
                Critical Only
              </Button>
              <Button
                variant={filter === "unacknowledged" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unacknowledged")}
                className="text-xs md:text-sm"
              >
                Unacknowledged
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchNotifications}
                disabled={loading}
                className="md:ml-auto text-xs md:text-sm"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {/* Notifications List */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && notifications.length === 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    All Clear!
                  </h3>
                  <p className="text-green-700">No {filter !== "all" ? `${filter} ` : ""}alarms</p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-3 md:gap-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-l-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${
                    notification.severity === "High"
                      ? "border-l-red-500 bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100"
                      : "border-l-yellow-500 bg-yellow-50 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-100"
                  }`}
                >
                  {/* Header with Icon, Title, and Badges */}
                  <CardHeader className="pb-3 md:pb-4">
                    <div className="flex flex-col gap-3">
                      {/* Title Row - Icon + Name + Severity Badge */}
                      <div className="flex items-start gap-2 justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {notification.severity === "High" ? (
                            <AlertTriangle className="h-5 md:h-6 w-5 md:w-6 text-red-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 md:h-6 w-5 md:w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <CardTitle
                              className={`text-sm md:text-base lg:text-lg font-bold break-words ${
                                notification.severity === "High"
                                  ? "text-red-900"
                                  : "text-yellow-900"
                              }`}
                            >
                              {notification.node_tag_name}
                            </CardTitle>
                          </div>
                        </div>
                        <Badge
                          className={`text-xs md:text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                            notification.severity === "High"
                              ? "bg-red-600 text-white"
                              : "bg-yellow-600 text-white"
                          }`}
                        >
                          {notification.severity === "High" ? "🔴 Critical" : "🟡 Warning"}
                        </Badge>
                      </div>

                      {/* Description Section */}
                      <div className="space-y-2">
                        {/* Threshold Info */}
                        <div className="bg-white/60 rounded px-3 py-2">
                          <p className="text-xs md:text-sm font-semibold text-gray-700 mb-1">
                            Threshold Info
                          </p>
                          <p className="text-xs md:text-sm text-gray-600 break-all">
                            {notification.station_name}
                          </p>
                        </div>

                        {/* Detailed Message */}
                        <div className="bg-white/60 rounded px-3 py-2">
                          <p className="text-xs md:text-sm font-semibold text-gray-700 mb-1">
                            Details
                          </p>
                          <p className="text-xs md:text-sm text-gray-600 break-all leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Footer with Timestamp and Actions */}
                  <CardContent className="space-y-3">
                    {/* Timestamp and Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs md:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Clock className="h-3 md:h-4 w-3 md:w-4 flex-shrink-0" />
                        <span className="break-all">
                          {new Date(notification.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex-shrink-0">
                        {notification.acknowledged ? (
                          <Badge className="bg-green-100 text-green-800 text-xs whitespace-nowrap">
                            ✓ Acknowledged
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 text-xs whitespace-nowrap">
                            ⏳ Pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      {!notification.acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(notification)}
                          disabled={processingId === notification.id}
                          className="flex-1 sm:flex-none text-xs md:text-sm"
                        >
                          <Check className="h-3 md:h-4 w-3 md:w-4 mr-1" />
                          {processingId === notification.id ? "Processing..." : "Acknowledge"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(notification)}
                        disabled={processingId === notification.id}
                        className="flex-1 sm:flex-none text-xs md:text-sm text-gray-600 hover:text-red-600"
                      >
                        <X className="h-3 md:h-4 w-3 md:w-4 mr-1" />
                        {processingId === notification.id ? "Processing..." : "Dismiss"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!loading && notifications.length > 0 && (
              <div className="text-center text-xs text-muted-foreground p-4 border-t">
                Showing {notifications.length} alarm{notifications.length !== 1 ? "s" : ""} •
                Last updated: {status?.last_updated ? new Date(status.last_updated).toLocaleTimeString() : "now"}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Notifications;