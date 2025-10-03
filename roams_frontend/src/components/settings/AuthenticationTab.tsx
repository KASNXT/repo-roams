import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, RotateCcw, UserX, Settings2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: "Admin" | "Operator" | "Viewer";
  status: "Active" | "Inactive";
  lastLogin: string;
}

const mockUsers: User[] = [
  {
    id: "1",
    username: "admin",
    email: "admin@roams.local",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-01-15 14:30"
  },
  {
    id: "2", 
    username: "operator1",
    email: "john.doe@roams.local",
    role: "Operator",
    status: "Active",
    lastLogin: "2024-01-15 09:15"
  },
  {
    id: "3",
    username: "viewer_readonly",
    email: "monitor@roams.local", 
    role: "Viewer",
    status: "Active",
    lastLogin: "2024-01-14 16:45"
  },
  {
    id: "4",
    username: "maintenance",
    email: "maint@roams.local",
    role: "Operator", 
    status: "Inactive",
    lastLogin: "2024-01-10 11:20"
  }
];

const roleColors = {
  Admin: "bg-destructive text-destructive-foreground",
  Operator: "bg-status-warning text-foreground", 
  Viewer: "bg-status-neutral text-foreground"
};

export function AuthenticationTab() {
  const [users] = useState<User[]>(mockUsers);
  const [ldapEnabled, setLdapEnabled] = useState(false);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
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

      {/* LDAP Integration */}
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
              <Switch 
                checked={ldapEnabled}
                onCheckedChange={setLdapEnabled}
              />
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

      {/* Users Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">User Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "Active" ? "default" : "secondary"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{user.lastLogin}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
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
              { name: "System Logs", admin: true, operator: true, viewer: false }
            ].map((perm, index) => (
              <div key={index} className="contents">
                <div className="py-2">{perm.name}</div>
                <div className="text-center py-2">
                  {perm.admin ? "✅" : "❌"}
                </div>
                <div className="text-center py-2">
                  {perm.operator ? "✅" : "❌"}
                </div>
                <div className="text-center py-2">
                  {perm.viewer ? "✅" : "❌"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}