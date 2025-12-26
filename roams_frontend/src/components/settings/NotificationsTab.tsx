import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Bell, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";

interface NotificationSetting {
  id: number;
  username: string;
  user_email: string;
  phone_number?: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  critical_alerts_only: boolean;
}

interface NotificationSubscription {
  id: number;
  node: number;
  node_name: string;
  station_name: string;
  user: number;
  username: string;
  user_email: string;
  alert_level: 'warning' | 'critical' | 'both';
  email_enabled: boolean;
  sms_enabled: boolean;
}

export function NotificationsTab() {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch notification settings and subscriptions
  useEffect(() => {
    loadNotificationData();
  }, []);

  const loadNotificationData = async () => {
    try {
      setLoading(true);
      const [settingsRes, subsRes] = await Promise.all([
        api.get<{ results?: NotificationSetting[] } | NotificationSetting[]>('/user-profiles/'),
        api.get<{ results?: NotificationSubscription[] } | NotificationSubscription[]>('/notification-recipients/')
      ]);
      
      const settingsPayload = settingsRes.data as { results?: NotificationSetting[] } | NotificationSetting[];
      const subsPayload = subsRes.data as { results?: NotificationSubscription[] } | NotificationSubscription[];

      const settingsList: NotificationSetting[] = Array.isArray(settingsPayload)
        ? settingsPayload
        : settingsPayload.results ?? [];

      const subsList: NotificationSubscription[] = Array.isArray(subsPayload)
        ? subsPayload
        : subsPayload.results ?? [];

      setNotificationSettings(settingsList);
      setSubscriptions(subsList);
    } catch (error) {
      console.error("Failed to load notification data:", error);
      toast.error("Unable to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserProfile = async (setting: NotificationSetting) => {
    try {
      await api.patch(`/user-profiles/${setting.id}/`, {
        phone_number: setting.phone_number,
        email_notifications: setting.email_notifications,
        sms_notifications: setting.sms_notifications,
        critical_alerts_only: setting.critical_alerts_only
      });
      
      toast.success(`✓ ${setting.username}'s profile updated`);
      setEditingId(null);
      loadNotificationData();
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update notification settings");
    }
  };

  const handleDeleteSubscription = async (subscriptionId: number) => {
    if (!confirm("Remove this notification subscription?")) return;
    
    try {
      await api.delete(`/notification-recipients/${subscriptionId}/`);
      toast.success("✓ Subscription removed");
      loadNotificationData();
    } catch (error) {
      console.error("Failed to delete subscription:", error);
      toast.error("Failed to remove subscription");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Notification Management</h3>
          <p className="text-sm text-muted-foreground">
            Configure user notification preferences and threshold alert subscriptions
          </p>
        </div>
      </div>

      {/* User Notification Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">User Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          {notificationSettings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No user profiles found
            </div>
          ) : (
            <div className="space-y-4">
              {notificationSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{setting.username}</h4>
                      <p className="text-sm text-muted-foreground">{setting.user_email}</p>
                    </div>
                    {editingId === setting.id ? (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateUserProfile(setting)}
                        className="bg-gradient-primary"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(setting.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {editingId === setting.id && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded">
                      {/* Phone Number */}
                      <div className="space-y-2">
                        <Label htmlFor={`phone-${setting.id}`}>Phone Number</Label>
                        <Input
                          id={`phone-${setting.id}`}
                          placeholder="+1234567890"
                          value={setting.phone_number || ''}
                          onChange={(e) => {
                            const updated = notificationSettings.map(s =>
                              s.id === setting.id ? { ...s, phone_number: e.target.value } : s
                            );
                            setNotificationSettings(updated);
                          }}
                        />
                      </div>

                      {/* Notification Toggles */}
                      <div className="space-y-2">
                        <Label>Notification Methods</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={setting.email_notifications}
                              onCheckedChange={(checked) => {
                                const updated = notificationSettings.map(s =>
                                  s.id === setting.id ? { ...s, email_notifications: checked } : s
                                );
                                setNotificationSettings(updated);
                              }}
                            />
                            <span className="text-sm">Email</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={setting.sms_notifications}
                              onCheckedChange={(checked) => {
                                const updated = notificationSettings.map(s =>
                                  s.id === setting.id ? { ...s, sms_notifications: checked } : s
                                );
                                setNotificationSettings(updated);
                              }}
                            />
                            <span className="text-sm">SMS</span>
                          </div>
                        </div>
                      </div>

                      {/* Critical Alerts Only */}
                      <div className="flex items-center gap-3 col-span-full">
                        <Switch
                          checked={setting.critical_alerts_only}
                          onCheckedChange={(checked) => {
                            const updated = notificationSettings.map(s =>
                              s.id === setting.id ? { ...s, critical_alerts_only: checked } : s
                            );
                            setNotificationSettings(updated);
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">Critical Alerts Only</p>
                          <p className="text-xs text-muted-foreground">Only receive critical level alerts, ignore warnings</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary Display */}
                  {editingId !== setting.id && (
                    <div className="flex flex-wrap gap-2">
                      {setting.email_notifications && (
                        <Badge variant="outline">📧 Email</Badge>
                      )}
                      {setting.sms_notifications && (
                        <Badge variant="outline">📱 SMS</Badge>
                      )}
                      {setting.critical_alerts_only && (
                        <Badge variant="secondary">⚠️ Critical Only</Badge>
                      )}
                      {!setting.email_notifications && !setting.sms_notifications && (
                        <Badge variant="secondary" className="text-muted-foreground">
                          No notifications enabled
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threshold Alert Subscriptions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Threshold Alert Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>No notification subscriptions configured</span>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Alert Level</TableHead>
                    <TableHead>Methods</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.username}</TableCell>
                      <TableCell>{sub.node_name}</TableCell>
                      <TableCell>{sub.station_name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          sub.alert_level === 'critical' ? 'destructive' :
                          sub.alert_level === 'warning' ? 'secondary' :
                          'default'
                        }>
                          {sub.alert_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {sub.email_enabled && <Badge variant="outline">📧</Badge>}
                          {sub.sms_enabled && <Badge variant="outline">📱</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSubscription(sub.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="shadow-card bg-muted/30 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">How Notifications Work</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Configure user preferences above to enable email and/or SMS notifications</li>
                <li>• Users can set their phone number and alert level preferences</li>
                <li>• Threshold breaches trigger notifications based on subscriptions</li>
                <li>• Critical alerts only mode ignores warning-level breaches</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
