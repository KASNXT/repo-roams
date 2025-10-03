import { ReactNode } from "react";
import { Settings } from "lucide-react";

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-surface">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          </div>
          
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer">Home</span>
            <span className="mx-2">›</span>
            <span className="text-foreground">Settings</span>
          </nav>
          
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Configure ROAMS operational and monitoring parameters. Changes affect all connected OPC UA clients and analysis modules.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}