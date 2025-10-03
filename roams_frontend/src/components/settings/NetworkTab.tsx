import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Wifi, Download, Upload, RotateCcw, Shield } from "lucide-react";

interface NetworkConfig {
  dhcp: boolean;
  ipAddress: string;
  subnet: string;
  gateway: string;
  primaryDns: string;
  secondaryDns: string;
  vpnEnabled: boolean;
}

export function NetworkTab() {
  const [config, setConfig] = useState<NetworkConfig>({
    dhcp: false,
    ipAddress: "192.168.1.100",
    subnet: "255.255.255.0", 
    gateway: "192.168.1.1",
    primaryDns: "8.8.8.8",
    secondaryDns: "8.8.4.4",
    vpnEnabled: true
  });

  const [testingConnection, setTestingConnection] = useState(false);

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTimeout(() => setTestingConnection(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Network Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure network connectivity and VPN settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleTestConnection}
            disabled={testingConnection}
          >
            <Wifi className="h-4 w-4 mr-2" />
            {testingConnection ? "Testing..." : "Test Connection"}
          </Button>
        </div>
      </div>

      {/* Network Status */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <StatusIndicator status="connected" label="Ethernet" className="mb-2" />
              <div className="text-sm text-muted-foreground">Primary Interface</div>
            </div>
            <div className="text-center">
              <StatusIndicator status="connected" label="Internet" className="mb-2" />
              <div className="text-sm text-muted-foreground">External Access</div>
            </div>
            <div className="text-center">
              <StatusIndicator status="warning" label="VPN" className="mb-2" />
              <div className="text-sm text-muted-foreground">Corporate Network</div>
            </div>
            <div className="text-center">
              <StatusIndicator status="connected" label="OPC UA" className="mb-2" />
              <div className="text-sm text-muted-foreground">Industrial Network</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IP Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">IP Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DHCP Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">DHCP Configuration</Label>
              <p className="text-sm text-muted-foreground">
                Automatically obtain IP address from DHCP server
              </p>
            </div>
            <Switch
              checked={config.dhcp}
              onCheckedChange={(checked: boolean) => setConfig(prev => ({ ...prev, dhcp: checked }))}
            />
          </div>

          {/* Static IP Fields */}
          {!config.dhcp && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ip-address">IP Address</Label>
                <Input
                  id="ip-address"
                  value={config.ipAddress}
                  onChange={(e) => setConfig(prev => ({ ...prev, ipAddress: e.target.value }))}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subnet">Subnet Mask</Label>
                <Input
                  id="subnet"
                  value={config.subnet}
                  onChange={(e) => setConfig(prev => ({ ...prev, subnet: e.target.value }))}
                  placeholder="255.255.255.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gateway">Default Gateway</Label>
                <Input
                  id="gateway"
                  value={config.gateway}
                  onChange={(e) => setConfig(prev => ({ ...prev, gateway: e.target.value }))}
                  placeholder="192.168.1.1"
                />
              </div>
            </div>
          )}

          {/* DNS Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-dns">Primary DNS</Label>
              <Input
                id="primary-dns"
                value={config.primaryDns}
                onChange={(e) => setConfig(prev => ({ ...prev, primaryDns: e.target.value }))}
                placeholder="8.8.8.8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-dns">Secondary DNS</Label>
              <Input
                id="secondary-dns"
                value={config.secondaryDns}
                onChange={(e) => setConfig(prev => ({ ...prev, secondaryDns: e.target.value }))}
                placeholder="8.8.4.4"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VPN Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">VPN Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">VPN Connection</Label>
              <p className="text-sm text-muted-foreground">
                Secure connection to corporate network
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={config.vpnEnabled}
                onCheckedChange={(checked: boolean) => setConfig(prev => ({ ...prev, vpnEnabled: checked }))}
              />
              {config.vpnEnabled && (
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Configuration Backup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Backup and restore network configuration settings
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Backup Config
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Restore Config
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}