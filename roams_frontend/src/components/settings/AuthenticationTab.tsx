import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, RotateCcw, UserX, Settings2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api"; // ✅ Import axios instance from your api.ts

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  last_login: string | null;
}

const roleColors: Record<string, string> = {
  Admin: "bg-destructive text-destructive-foreground",
  Operator: "bg-status-warning text-foreground",
  Viewer: "bg-status-neutral text-foreground",
};

export function AuthenticationTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch users from backend
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.get<{ results: User[] }>("/users/");
        setUsers(Array.isArray(res.data.results) ? res.data.results : []);

      } catch (error) {
        console.error("❌ Failed to load users:", error);
        toast.error("Unable to fetch users from backend");
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const getRole = (user: User): "Admin" | "Operator" | "Viewer" => {
    if (user.is_staff) return "Admin";
    // You can add more logic here later (like checking groups)
    return "Viewer";
  };

  const getStatus = (user: User): "Active" | "Inactive" => {
    return user.is_active ? "Active" : "Inactive";
  };

  return (
    <div className="space-y-6">
      {/* --- Action Bar --- */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Authentication Settings</h3>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and access permissions
          </p>
        </div>
        <Button size="sm" className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* --- LDAP Integration --- */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Directory Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">LDAP/Active Directory</p>
              <p className="text-sm text-muted-foreground">
                Integrate with existing corporate directory services
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={ldapEnabled} onCheckedChange={setLdapEnabled} />
              {ldapEnabled && (
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Users Table --- */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">User Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading user data...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No user accounts found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const role = getRole(user);
                  const status = getStatus(user);
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.profile?.phone_number ? (
                            <span>{user.profile.phone_number}</span>
                          ) : (
                            <span className="text-xs italic text-gray-400">Not set</span>
                          )}
                        </TableCell>
                      <TableCell>
                        <Badge className={roleColors[role]}>{role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status === "Active" ? "default" : "secondary"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- Permissions Matrix --- */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="font-medium">Permission</div>
            <div className="font-medium text-center">Admin</div>
            <div className="font-medium text-center">Operator</div>
            <div className="font-medium text-center">Viewer</div>

            {[
              { name: "View Dashboard", admin: true, operator: true, viewer: true },
              { name: "Modify Settings", admin: true, operator: false, viewer: false },
              { name: "Control Equipment", admin: true, operator: true, viewer: false },
              { name: "View Reports", admin: true, operator: true, viewer: true },
              { name: "User Management", admin: true, operator: false, viewer: false },
              { name: "System Logs", admin: true, operator: true, viewer: false },
            ].map((perm, index) => (
              <div key={index} className="contents">
                <div className="py-2">{perm.name}</div>
                <div className="text-center py-2">{perm.admin ? "✅" : "❌"}</div>
                <div className="text-center py-2">{perm.operator ? "✅" : "❌"}</div>
                <div className="text-center py-2">{perm.viewer ? "✅" : "❌"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
