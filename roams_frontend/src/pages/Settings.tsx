import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpcServerTab } from "@/components/settings/OpcServerTab";
import { NodeManagementTab } from "@/components/settings/NodeManagementTab";
import { ThresholdsTab } from "@/components/settings/ThresholdsTab";
import { NetworkTab } from "@/components/settings/NetworkTab";
import { AuthenticationTab } from "@/components/settings/AuthenticationTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/analysis/ThemeToggle";
import { UserDisplay } from "@/components/UserDisplay";

const Settings = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-surface px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">ROAMS - Settings</h1>
                <p className="text-xs text-muted-foreground">System Configuration & Management</p>
              </div>
              
               
            </div>
            <div className="flex items-center gap-3 ml-auto">
                  <ThemeToggle />
                  <UserDisplay />
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <Tabs defaultValue="opcserver" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="opcserver">RTU Clients</TabsTrigger>
                <TabsTrigger value="nodes">Node Management</TabsTrigger>
                <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
              </TabsList>
              
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
              
              <TabsContent value="network" className="space-y-4">
                <NetworkTab />
              </TabsContent>
              
              <TabsContent value="auth" className="space-y-4">
                <AuthenticationTab />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Settings;