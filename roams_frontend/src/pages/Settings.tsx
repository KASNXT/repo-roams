import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OpcServerTab } from "@/components/settings/OpcServerTab";
import { NodeManagementTab } from "@/components/settings/NodeManagementTab";
import { ThresholdsTab } from "@/components/settings/ThresholdsTab";
import { NetworkTab } from "@/components/settings/NetworkTab";
import { AuthenticationTab } from "@/components/settings/AuthenticationTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { AlarmRetentionTab } from "@/components/settings/AlarmRetentionTab";
import { RefreshSettingsTab } from "@/components/settings/RefreshSettingsTab";
import { TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/analysis/ThemeToggle";
import { UserDisplay } from "@/components/UserDisplay";
import { useState } from "react";
import { L2TPClientsTab } from "@/components/vpn/L2TPClientsTab";
import { OpenVPNClientsTab } from "@/components/vpn/OpenVPNClientsTab";
import { VPNAuditLogTab } from "@/components/vpn/VPNAuditLogTab";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("network");

  const tabs = [
    { value: "network", label: "Network Configuration" },
    { value: "vpn", label: "VPN Management" },
    { value: "opcserver", label: "RTU Client Configuration" },
    { value: "nodes", label: "Node Management" },
    { value: "thresholds", label: "Threshold Settings" },
    { value: "notifications", label: "Notification Settings" },
    { value: "alarms", label: "Alarm Retention Policy" },
    { value: "auth", label: "User Authentication" },
    { value: "refresh", label: "Auto-Refresh Settings" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col max-h-screen overflow-y-auto">
          {/* Header - Sticky on ALL screens - Inline */}
          <header className="sticky top-0 z-50 flex flex-row h-auto md:h-16 shrink-0 gap-2 border-b bg-gradient-surface/95 backdrop-blur supports-[backdrop-filter]:bg-gradient-surface/80 px-4 py-2 md:py-0 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <SidebarTrigger className="-ml-1" />
              <TrendingUp className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground truncate">BROMS - Settings</h1>
                <p className="text-xs text-muted-foreground hidden md:block">System Configuration & Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <ThemeToggle />
              <UserDisplay />
            </div>
          </header>

          {/* Main Content - Scrollable */}
          <div className="flex-1 p-2 md:p-6">
            {/* Mobile: Dropdown Navigation */}
            <div className="md:hidden mb-4">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Setting" />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>
                      {tab.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Desktop: Tab Navigation */}
              <TabsList className="hidden md:grid w-full grid-cols-5 lg:grid-cols-9 mb-6 h-auto gap-1 p-1">
                <TabsTrigger value="network" className="text-sm">Network</TabsTrigger>
                <TabsTrigger value="vpn" className="text-sm">VPN</TabsTrigger>
                <TabsTrigger value="opcserver" className="text-sm">RTU Config</TabsTrigger>
                <TabsTrigger value="nodes" className="text-sm">Nodes</TabsTrigger>
                <TabsTrigger value="thresholds" className="text-sm">Thresholds</TabsTrigger>
                <TabsTrigger value="notifications" className="text-sm">Notify</TabsTrigger>
                <TabsTrigger value="alarms" className="text-sm">Alarms</TabsTrigger>
                <TabsTrigger value="auth" className="text-sm">Users</TabsTrigger>
                <TabsTrigger value="refresh" className="text-sm">Refresh</TabsTrigger>
              </TabsList>
                            <TabsContent value="vpn" className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h2 className="text-lg font-semibold mb-2">L2TP/IPsec</h2>
                                  <L2TPClientsTab />
                                </div>
                                <div>
                                  <h2 className="text-lg font-semibold mb-2">OpenVPN</h2>
                                  <OpenVPNClientsTab />
                                </div>
                              </div>
                              <div className="mt-8">
                                <VPNAuditLogTab />
                              </div>
                            </TabsContent>
              
              <TabsContent value="network" className="space-y-4">
                <NetworkTab />
              </TabsContent>
              
              <TabsContent value="opcserver" className="space-y-4">
                <OpcServerTab />
              </TabsContent>
              
              <TabsContent value="nodes" className="space-y-4">
                <NodeManagementTab />
              </TabsContent>
              
              <TabsContent value="thresholds" className="space-y-4">
                <ThresholdsTab />
              </TabsContent>
              
                <TabsContent value="notifications" className="space-y-4">
                  <NotificationsTab />
                </TabsContent>

              <TabsContent value="alarms" className="space-y-4">
                <AlarmRetentionTab />
              </TabsContent>
              
              <TabsContent value="auth" className="space-y-4">
                <AuthenticationTab />
              </TabsContent>

              <TabsContent value="refresh" className="space-y-4">
                <RefreshSettingsTab />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Settings;