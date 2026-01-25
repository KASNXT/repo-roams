import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, RotateCcw, UserX, Settings2, ChevronDown, Check, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { AddUserModal } from "./AddUserModal";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Checkbox,
} from "@/components/ui/checkbox";

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  last_login: string | null;
  role?: string;
}

const roleColors: Record<string, string> = {
  Admin: "bg-destructive text-destructive-foreground",
  Technician: "bg-blue-600 text-white",
  Operator: "bg-status-warning text-foreground",
  Viewer: "bg-status-neutral text-foreground",
};

interface PermissionsMatrix {
  permissions: string[];
  roles: Record<string, boolean[]>;
}

export function AuthenticationTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [permissionsMatrix, setPermissionsMatrix] = useState<PermissionsMatrix | null>(null);
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [tempPermissions, setTempPermissions] = useState<PermissionsMatrix | null>(null);

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

  // ✅ Fetch permissions matrix
  useEffect(() => {
    const loadPermissionsMatrix = async () => {
      try {
        const res = await api.get<PermissionsMatrix>("/users/permissions_matrix/");
        setPermissionsMatrix(res.data);
      } catch (error) {
        console.error("Failed to load permissions matrix:", error);
      }
    };
    loadPermissionsMatrix();
  }, []);

  // ✅ Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getRole = (user: User): "Admin" | "Technician" | "Operator" | "Viewer" => {
    if (user.role === 'admin') return "Admin";
    if (user.role === 'technician') return "Technician";
    if (user.role === 'operator') return "Operator";
    return "Viewer";
  };

  const getStatus = (user: User): "Active" | "Inactive" => {
    return user.is_active ? "Active" : "Inactive";
  };

  // ✅ Check if current user is admin or superuser
  const isCurrentUserAdmin = currentUser?.is_staff;

  // ✅ Handle permission matrix toggle
  const handlePermissionToggle = (role: string, permissionIndex: number) => {
    if (!tempPermissions) return;
    
    const newPermissions = { ...tempPermissions };
    newPermissions.roles[role][permissionIndex] = !newPermissions.roles[role][permissionIndex];
    setTempPermissions(newPermissions);
  };

  // ✅ Save permissions matrix
  const handleSavePermissions = async () => {
    if (!tempPermissions) return;
    
    try {
      await api.post("/users/permissions_matrix/", tempPermissions);
      setPermissionsMatrix(tempPermissions);
      setEditingPermissions(false);
      toast.success("Permissions matrix updated successfully");
    } catch (error: any) {
      toast.error("Failed to update permissions matrix");
    }
  };

  const handleUserAction = async (userId: number, action: string, user: User, newRole?: string) => {
    if (!isCurrentUserAdmin) {
      toast.error("Only admins can manage users");
      return;
    }

    try {
      let response;
      if (action === 'activate') {
        response = await api.post(`/users/${userId}/activate/`);
      } else if (action === 'deactivate') {
        response = await api.post(`/users/${userId}/deactivate/`);
      } else if (action === 'setRole' && newRole) {
        response = await api.post(`/users/${userId}/set_user_role/`, { role: newRole });
      }

      if (response?.status === 200) {
        toast.success(response.data.message);
        // Reload users
        const res = await api.get<{ results: User[] }>("/users/");
        setUsers(Array.isArray(res.data.results) ? res.data.results : []);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || `Failed to ${action} user`;
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* --- Action Bar --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Authentication Settings</h3>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and access permissions
          </p>
        </div>
        {isCurrentUserAdmin ? (
          <Button 
            size="sm" 
            className="bg-gradient-primary w-full sm:w-auto"
            onClick={() => setShowAddUserModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Only admins can add users</p>
        )}
      </div>

      {/* --- LDAP Integration --- */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">Directory Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium">LDAP/Active Directory</p>
              <p className="text-sm text-muted-foreground">
                Integrate with existing corporate directory services
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch 
                checked={ldapEnabled} 
                onCheckedChange={setLdapEnabled}
                disabled={!isCurrentUserAdmin}
              />
              {ldapEnabled && isCurrentUserAdmin && (
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Users Table (Desktop & Mobile Views) --- */}
      <Card className="shadow-card w-full overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-medium">User Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading user data...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No user accounts found.
            </div>
          ) : isMobile ? (
            // ✅ Mobile View: Card-based layout
            <div className="space-y-3">
              {users.map((user) => {
                const role = getRole(user);
                const status = getStatus(user);
                return (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={roleColors[role]}>{role}</Badge>
                        <Badge variant={status === "Active" ? "default" : "secondary"}>
                          {status}
                        </Badge>
                      </div>
                    </div>
                    {user.last_login && (
                      <p className="text-xs text-muted-foreground">
                        Last login: {new Date(user.last_login).toLocaleString()}
                      </p>
                    )}
                    {isCurrentUserAdmin && user.id !== currentUser?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'setRole', user, 'viewer')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Set as Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'setRole', user, 'technician')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Set as Technician
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'setRole', user, 'operator')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Set as Operator
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'setRole', user, 'admin')}
                            disabled={user.role === 'admin'}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Promote to Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, user.is_active ? 'deactivate' : 'activate', user)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {user.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // ✅ Desktop View: Table layout
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    {isCurrentUserAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const role = getRole(user);
                    const status = getStatus(user);
                    const canModify = isCurrentUserAdmin && user.id !== currentUser?.id;
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
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
                        {isCurrentUserAdmin && (
                          <TableCell className="text-right">
                            {canModify ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    Actions
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => handleUserAction(user.id, 'setRole', user, 'viewer')}
                                  >
                                    Set as Viewer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUserAction(user.id, 'setRole', user, 'technician')}
                                  >
                                    Set as Technician
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUserAction(user.id, 'setRole', user, 'operator')}
                                  >
                                    Set as Operator
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUserAction(user.id, 'setRole', user, 'admin')}
                                    disabled={user.role === 'admin'}
                                  >
                                    Promote to Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUserAction(user.id, user.is_active ? 'deactivate' : 'activate', user)}
                                  >
                                    {user.is_active ? "Deactivate" : "Activate"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-xs text-muted-foreground">Current User</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Permissions Matrix --- */}
      <Card className="shadow-card w-full overflow-x-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Role Permissions Matrix</CardTitle>
          {isCurrentUserAdmin && (
            <Button 
              size="sm" 
              variant={editingPermissions ? "destructive" : "outline"}
              onClick={() => {
                if (editingPermissions) {
                  setEditingPermissions(false);
                  setTempPermissions(null);
                } else {
                  setEditingPermissions(true);
                  setTempPermissions(permissionsMatrix);
                }
              }}
            >
              {editingPermissions ? "Cancel" : "Edit Permissions"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {permissionsMatrix ? (
            <div className="overflow-x-auto">
              {editingPermissions && tempPermissions ? (
                // ✅ Editable mode for admins
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-3 px-4 font-semibold">Permission</th>
                          {Object.keys(tempPermissions.roles).map((role) => (
                            <th key={role} className="text-center py-3 px-4 font-semibold capitalize">
                              {role}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tempPermissions.permissions.map((permission, permIndex) => (
                          <tr key={permIndex} className="border-b hover:bg-muted/30">
                            <td className="py-4 px-4 font-medium">{permission}</td>
                            {Object.keys(tempPermissions.roles).map((role) => (
                              <td key={role} className="text-center py-4 px-4">
                                <Checkbox
                                  checked={tempPermissions.roles[role][permIndex]}
                                  onCheckedChange={() => handlePermissionToggle(role, permIndex)}
                                  className="cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSavePermissions} className="bg-gradient-primary">
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingPermissions(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // ✅ View mode for everyone (also tabular)
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold">Permission</th>
                        {Object.keys(permissionsMatrix.roles).map((role) => (
                          <th key={role} className="text-center py-3 px-4 font-semibold capitalize">
                            {role}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permissionsMatrix.permissions.map((permission, permIndex) => (
                        <tr key={permIndex} className="border-b hover:bg-muted/30">
                          <td className="py-4 px-4 font-medium">{permission}</td>
                          {Object.keys(permissionsMatrix.roles).map((role) => (
                            <td key={role} className="text-center py-4 px-4">
                              {permissionsMatrix.roles[role][permIndex] ? (
                                <Check className="h-5 w-5 inline text-green-600" />
                              ) : (
                                <X className="h-5 w-5 inline text-red-600" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Loading permissions matrix...
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Add User Modal --- */}
      <AddUserModal 
        open={showAddUserModal} 
        onOpenChange={setShowAddUserModal}
        onUserAdded={() => {
          // Reload users after new user is added
          const loadUsers = async () => {
            try {
              const res = await api.get<{ results: User[] }>("/users/");
              setUsers(Array.isArray(res.data.results) ? res.data.results : []);
            } catch (error) {
              console.error("Failed to reload users:", error);
            }
          };
          loadUsers();
        }}
      />
    </div>
  );
}
