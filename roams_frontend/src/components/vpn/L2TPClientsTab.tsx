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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Trash2, Loader2 } from "lucide-react";
import {
  fetchL2TPStatus,
  createL2TPClient,
  revokeL2TPClient,
  activateL2TPClient,
  L2TPVPNClient,
} from "@/services/api";

export function L2TPClientsTab() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openRevoke, setOpenRevoke] = useState(false);
  const [selectedClient, setSelectedClient] = useState<L2TPVPNClient | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["l2tp-status"],
    queryFn: fetchL2TPStatus,
  });

  const clients = data?.clients ?? [];
  const configuredClients = data?.configured_clients ?? [];
  const serverRunning = data?.server_running ?? false;

  const revokeMutation = useMutation({
    mutationFn: revokeL2TPClient,
    onSuccess: () => {
      refetch();
      setOpenRevoke(false);
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateL2TPClient,
    onSuccess: () => refetch(),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700";
      case "inactive":
        return "bg-yellow-500/20 text-yellow-700";
      case "revoked":
        return "bg-red-500/20 text-red-700";
      default:
        return "bg-gray-500/20 text-gray-700";
    }
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">L2TP/IPsec VPN Clients</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-3 h-3 rounded-full ${serverRunning ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm">
              {serverRunning ? "Server Running" : "Server Down"}
            </span>
            <span className="text-xs text-muted-foreground">
              ({clients.length} connected)
            </span>
          </div>
        </div>

        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Configured Clients */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted p-2 font-semibold text-sm">
          Configured Clients
        </div>

        {isLoading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : configuredClients.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No clients configured
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>VPN IP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuredClients.map((client: any) => (
                <TableRow key={client.id}>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.vpn_ip}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(client.status)}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {client.status === "revoked" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => activateMutation.mutate(client.id)}
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client);
                          setOpenRevoke(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Live Connected Clients */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted p-2 font-semibold text-sm">
          Live Connected Clients
        </div>

        {clients.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No clients connected
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>VPN IP</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.vpn_address}</TableCell>
                  <TableCell>{client.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Revoke Dialog */}
      <AlertDialog open={openRevoke} onOpenChange={setOpenRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Client?</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke access for {selectedClient?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex justify-end gap-3 pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedClient &&
                revokeMutation.mutate(selectedClient.id)
              }
              disabled={revokeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {revokeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Revoke
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}