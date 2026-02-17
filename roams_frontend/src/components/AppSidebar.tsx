import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  BarChart3, 
  Bell, 
  Settings, 
  TrendingUp,
  ChevronRight,
  Sliders,
  User,
  LogOut,
  MapPin,
  Database,
  Wifi,
  Lock
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { fetchStations, Station } from "@/services/api";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Analysis", url: "/analysis", icon: BarChart3 },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Control", url: "/control", icon: Sliders },
  { title: "Overview", url: "/overview", icon: TrendingUp },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "VPN Connections", url: "/vpn-connections", icon: Lock, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isCollapsed = state === "collapsed";

  const [selectedStation, setSelectedStation] = useState<string>("");
  const [stations, setStations] = useState<Station[]>([]);
  const [systemStatus, setSystemStatus] = useState({
    opcua: false,
    database: true, // Assume DB is online if we're logged in
  });

  // Fetch stations on mount
  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await fetchStations();
        setStations(data);
        
        // Restore selected station from localStorage
        const saved = localStorage.getItem("selectedWell");
        if (saved && data.some((s) => s.station_name === saved)) {
          setSelectedStation(saved);
        } else if (data.length > 0) {
          setSelectedStation(data[0].station_name);
        }

        // Update OPC UA status based on active stations
        const hasActiveStation = data.some((s) => s.active);
        setSystemStatus(prev => ({ ...prev, opcua: hasActiveStation }));
      } catch (err) {
        console.error("Failed to load stations:", err);
        setSystemStatus(prev => ({ ...prev, database: false }));
      }
    };

    loadStations();
  }, []);

  // Persist station selection
  useEffect(() => {
    if (selectedStation) {
      localStorage.setItem("selectedWell", selectedStation);
    }
  }, [selectedStation]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleStationChange = (value: string) => {
    setSelectedStation(value);
    // Navigate to analysis page when station changes
    if (location.pathname !== "/analysis" && location.pathname !== "/") {
      navigate("/analysis");
    }
  };

  return (
    <TooltipProvider>
      <Sidebar className="border-r border-sidebar-border">
        <SidebarContent className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex flex-row items-center gap-3 p-4 border-b border-sidebar-border">
            <img src="/roamslogo.png" alt="BROMS Logo" className="h-12 w-12 shrink-0"/>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-sidebar-foreground leading-tight">BROMS</h1>
              <p className="text-xs text-sidebar-foreground/60">Monitoring System</p>
            </div>
          </div>

        {/* Station Selector */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="space-y-1">
            <label className="text-xs font-medium text-sidebar-foreground/60">Active Station</label>
            <Select value={selectedStation} onValueChange={handleStationChange}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Select Station" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.station_name}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${station.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {station.station_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="space-y-2">
            <p className="text-xs font-medium text-sidebar-foreground/60 mb-2">System Status</p>
            <div className="flex items-center gap-2 text-xs">
              <Wifi className={`h-3 w-3 ${systemStatus.opcua ? 'text-green-500' : 'text-red-500'}`} />
              <span className="flex-1">OPC UA</span>
              <div className={`h-2 w-2 rounded-full ${systemStatus.opcua ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Database className={`h-3 w-3 ${systemStatus.database ? 'text-green-500' : 'text-red-500'}`} />
              <span className="flex-1">Database</span>
              <div className={`h-2 w-2 rounded-full ${systemStatus.database ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems
                .filter((item) => !item.adminOnly || (item.adminOnly && (user?.is_staff || user?.role === "admin")))
                .map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? "bg-sidebar-accent text-sidebar-primary hover:bg-sidebar-accent" 
                            : "hover:bg-sidebar-accent/30"
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm flex-1">{item.title}</span>
                        {!isCollapsed && (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Profile Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{user?.username || "User"}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role || (user?.is_staff ? "Admin" : "Operator")}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="flex-shrink-0 h-8 w-8"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Copyright Footer */}
        <div className="px-4 py-3 border-t border-sidebar-border">
          <p className="text-xs text-center text-sidebar-foreground/60">
            © 2026 BROMS. All rights reserved.
          </p>
        </div>
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
}