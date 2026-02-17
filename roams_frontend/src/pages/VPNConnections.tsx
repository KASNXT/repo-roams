import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/analysis/ThemeToggle";
import { UserDisplay } from "@/components/UserDisplay";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { L2TPClientsTab } from "@/components/vpn/L2TPClientsTab";
import { OpenVPNClientsTab } from "@/components/vpn/OpenVPNClientsTab";
import { VPNAuditLogTab } from "@/components/vpn/VPNAuditLogTab";

const VPNConnections = () => {
  const [activeTab, setActiveTab] = useState("l2tp");
  const { user } = useAuth();

  // Admin-only check
  if (user?.role !== "admin" && !user?.is_staff) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col max-h-screen overflow-y-auto">
            <header className="sticky top-0 z-50 flex flex-row h-auto md:h-16 shrink-0 gap-2 border-b bg-gradient-surface/95 backdrop-blur supports-[backdrop-filter]:bg-gradient-surface/80 px-4 py-2 md:py-0 shadow-sm">
              <div className="flex items-center gap-2 flex-1">
                <SidebarTrigger className="-ml-1" />
                <Network className="h-6 w-6 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg md:text-xl font-bold text-foreground truncate">VPN Connections</h1>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <ThemeToggle />
                <UserDisplay />
              </div>
            </header>

            <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-600" />
                <div>
                  <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                  <p className="text-muted-foreground">Only administrators can manage VPN connections.</p>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const tabs = [
    { value: "l2tp", label: "L2TP Clients" },
    { value: "openvpn", label: "OpenVPN Clients" },
    { value: "audit", label: "Audit Log" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col max-h-screen overflow-y-auto">
          {/* Header - Sticky on ALL screens */}
          <header className="sticky top-0 z-50 flex flex-row h-auto md:h-16 shrink-0 gap-2 border-b bg-gradient-surface/95 backdrop-blur supports-[backdrop-filter]:bg-gradient-surface/80 px-4 py-2 md:py-0 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <SidebarTrigger className="-ml-1" />
              <Network className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground truncate">VPN Connections</h1>
                <p className="text-xs text-muted-foreground hidden md:block">Manage VPN Credentials & Access</p>
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
                  <SelectValue placeholder="Select Tab" />
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

            {/* Tabs Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Desktop: Tab List */}
              <TabsList className="hidden md:grid w-full grid-cols-3 mb-6">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab Contents */}
              <TabsContent value="l2tp" className="space-y-4">
                <L2TPClientsTab />
              </TabsContent>

              <TabsContent value="openvpn" className="space-y-4">
                <OpenVPNClientsTab />
              </TabsContent>

              <TabsContent value="audit" className="space-y-4">
                <VPNAuditLogTab />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default VPNConnections;
