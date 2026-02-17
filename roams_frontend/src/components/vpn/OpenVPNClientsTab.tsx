import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Plus, Trash2, RefreshCw, Copy, Check } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  getOpenVPNClients,
  createOpenVPNClient,
  downloadOpenVPNConfig,
  revokeOpenVPNClient,
  activateOpenVPNClient,
  OpenVPNClient,
} from "@/services/api";

export function OpenVPNClientsTab() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openRevoke, setOpenRevoke] = useState(false);
  const [selectedClient, setSelectedClient] = useState<OpenVPNClient | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    protocol: "udp" as const,
    port: 1194,
    compression_enabled: true,
  });

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["openvpn-clients"],
    queryFn: getOpenVPNClients,
  });

  const createMutation = useMutation({
    mutationFn: createOpenVPNClient,
    onSuccess: () => {
      refetch();
      setOpenCreate(false);
      setFormData({ name: "", protocol: "udp", port: 1194, compression_enabled: true });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeOpenVPNClient,
    onSuccess: () => {
      refetch();
      setOpenRevoke(false);
      setSelectedClient(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateOpenVPNClient,
    onSuccess: () => {
      refetch();
    },
  });

  const handleDownload = async (clientId: number, clientName: string) => {
    try {
      const blob = await downloadOpenVPNConfig(clientId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientName}.ovpn`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download config:", err);
    }
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = () => {
    if (!formData.name) {
      alert("Please enter a client name");
      return;
    }
    createMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700 dark:bg-green-950/30 dark:text-green-400";
      case "inactive":
        return "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400";
      case "revoked":
        return "bg-red-500/20 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      default:
        return "bg-gray-500/20 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400";
    }
  };

  const getExpiryColor = (daysLeft: number) => {
    if (daysLeft > 90) return "text-green-600";
    if (daysLeft > 30) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">OpenVPN Clients</h3>
          <p className="text-sm text-muted-foreground">Manage admin/operator OpenVPN certificates (10.8.0.0/24 network)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New OpenVPN Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create OpenVPN Client</DialogTitle>
                <DialogDescription>
                  Create a new OpenVPN client. Certificate will be auto-generated.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Client Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., admin_laptop, field_operator"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="protocol">Protocol</Label>
                    <Select value={formData.protocol} onValueChange={(val: any) => setFormData({ ...formData, protocol: val })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="udp">UDP</SelectItem>
                        <SelectItem value="tcp">TCP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="compression"
                    type="checkbox"
                    checked={formData.compression_enabled}
                    onChange={(e) => setFormData({ ...formData, compression_enabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="compression" className="font-normal cursor-pointer">
                    Enable LZ4 Compression
                  </Label>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Client
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Clients Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No OpenVPN clients configured yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Certificate CN</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>VPN IP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Expires In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{client.common_name}</code>
                        <button
                          onClick={() => handleCopy(client.common_name, client.id)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copy CN"
                        >
                          {copied === client.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {client.protocol.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.vpn_ip}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(client.status)}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getExpiryColor(client.days_until_expiry)}`}>
                      {client.days_until_expiry}d
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(client.id, client.name)}
                        title="Download .ovpn config"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {client.status === "revoked" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => activateMutation.mutate(client.id)}
                          disabled={activateMutation.isPending}
                          title="Reactivate client"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setOpenRevoke(true);
                          }}
                          title="Revoke client"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={openRevoke} onOpenChange={setOpenRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke OpenVPN Client?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke <strong>{selectedClient?.name}</strong>? This will invalidate the certificate immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogContent className="flex gap-3 justify-end border-t pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClient && revokeMutation.mutate(selectedClient.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
