import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Plus, Trash2, RefreshCw, Copy, Check, Loader2 } from "lucide-react";
import {
  getL2TPClients,
  createL2TPClient,
  downloadL2TPConfig,
  revokeL2TPClient,
  activateL2TPClient,
  L2TPVPNClient,
  fetchStations,
  Station,
} from "@/services/api";

export function L2TPClientsTab() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openRevoke, setOpenRevoke] = useState(false);
  const [selectedClient, setSelectedClient] = useState<L2TPVPNClient | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    vpn_ip: "10.99.0.",
    server_ip: "144.91.79.167",
    max_connections: 1,
    station: "" as string,
  });

  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);

  useEffect(() => {
    if (openCreate) {
      setStationsLoading(true);
      fetchStations().then((data) => {
        setStations(data);
        setStationsLoading(false);
      });
    }
  }, [openCreate]);

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["l2tp-vpn-clients"],
    queryFn: getL2TPClients,
  });

  const createMutation = useMutation({
    mutationFn: createL2TPClient,
    onSuccess: () => {
      refetch();
      setOpenCreate(false);
      setFormData({ name: "", vpn_ip: "10.99.0.", server_ip: "144.91.79.167", max_connections: 1, station: "" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeL2TPClient,
    onSuccess: () => {
      refetch();
      setOpenRevoke(false);
      setSelectedClient(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateL2TPClient,
    onSuccess: () => {
      refetch();
    },
  });

  const handleDownload = async (clientId: number, clientName: string) => {
    try {
      const blob = await downloadL2TPConfig(clientId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientName}_l2tp_setup.txt`;
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
    if (!formData.name || !formData.vpn_ip || !formData.server_ip) {
      alert("Please fill in all required fields");
      return;
    }
    if (!formData.station) {
      alert("Please select a station");
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
          <h3 className="text-lg font-semibold">L2TP/IPsec VPN Clients</h3>
          <p className="text-sm text-muted-foreground">Manage station L2TP credentials (10.99.0.0/24 network)</p>
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
                New L2TP Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create L2TP VPN Client</DialogTitle>
                <DialogDescription>
                  Create a new L2TP/IPsec client. Credentials will be auto-generated.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Client Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Bombo_Station"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="station">Station *</Label>
                  <Select
                    value={formData.station}
                    onValueChange={(val: string) => setFormData({ ...formData, station: val })}
                    disabled={stationsLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={stationsLoading ? "Loading stations..." : "Select station"} />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id.toString()}>
                          {station.station_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vpn_ip">VPN IP Address (10.99.0.x) *</Label>
                  <Input
                    id="vpn_ip"
                    placeholder="10.99.0.50"
                    value={formData.vpn_ip}
                    onChange={(e) => setFormData({ ...formData, vpn_ip: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="server_ip">VPN Server IP *</Label>
                  <Input
                    id="server_ip"
                    placeholder="144.91.79.167"
                    value={formData.server_ip}
                    onChange={(e) => setFormData({ ...formData, server_ip: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="max_connections">Max Connections</Label>
                  <Input
                    id="max_connections"
                    type="number"
                    min="1"
                    value={formData.max_connections}
                    onChange={(e) => setFormData({ ...formData, max_connections: parseInt(e.target.value) })}
                    className="mt-1"
                  />
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
            <p>No L2TP clients configured yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
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
                        <code className="text-xs bg-muted px-2 py-1 rounded">{client.username}</code>
                        <button
                          onClick={() => handleCopy(client.username, client.id)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copy username"
                        >
                          {copied === client.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
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
                        title="Download setup guide"
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
            <AlertDialogTitle>Revoke L2TP Client?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke access for <strong>{selectedClient?.name}</strong>? This action can be undone by reactivating the client.
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
