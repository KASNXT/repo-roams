import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  BarChart3, 
  Bell, 
  Settings, 
  TrendingUp,
  ChevronRight,
  Sliders
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Analysis", url: "/analysis", icon: BarChart3 },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Control", url: "/control", icon: Sliders },
  { title: "Overview", url: "/overview", icon: TrendingUp },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Logo Section */}
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
          {/*<TrendingUp className="h-8 w-8 text-primary" />*/}
          <img src="/roamslogo.png" alt="ROAMS Logo" className="h-8 w-8"/>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">ROAMS</h1>
              <p className="text-xs text-sidebar-foreground/60">Monitoring System</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={isActive ? "bg-sidebar-accent text-sidebar-primary" : ""}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                        {!isCollapsed && isActive && (
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}