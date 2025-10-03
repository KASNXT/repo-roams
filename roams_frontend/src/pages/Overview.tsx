import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const Overview = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-gradient-surface px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">ROAMS - Overview</h1>
                <p className="text-xs text-muted-foreground">System Overview & Summary</p>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6">
            <Card className="shadow-card text-center">
              <CardContent className="pt-8 pb-8">
                <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-4">System Overview</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  This page will provide a comprehensive overview of your ROAMS monitoring system performance and statistics.
                </p>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Overview;