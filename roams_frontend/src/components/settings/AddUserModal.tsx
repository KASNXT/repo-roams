import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/services/api";
import { Loader2 } from "lucide-react";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded?: () => void;
}

export function AddUserModal({ open, onOpenChange, onUserAdded }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "viewer",
    is_active: true,
  });

  const ROLE_OPTIONS = [
    { value: 'viewer', label: 'Viewer (Read-only access)' },
    { value: 'technician', label: 'Technician (Equipment control)' },
    { value: 'operator', label: 'Operator (Full access)' },
    { value: 'admin', label: 'Admin (System admin)' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      toast.error("Username is required");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!formData.password) {
      toast.error("Password is required");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/users/", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        is_active: formData.is_active,
      });

      if (res.status === 201) {
        toast.success(`User '${formData.username}' created successfully as ${formData.role}`);
        setFormData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "viewer",
          is_active: true,
        });
        onOpenChange(false);
        onUserAdded?.();
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || "Failed to create user";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add New User</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Create a new user account with specified role and access permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Username */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="username" className="text-sm">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="e.g., john.doe"
              value={formData.username}
              onChange={handleInputChange}
              disabled={loading}
              className="h-9 sm:h-10 text-sm"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="e.g., john@example.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              className="h-9 sm:h-10 text-sm"
            />
          </div>

          {/* Password Fields - Side by side on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Password */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={loading}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
          </div>

          {/* Role and Active Status - Side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Role Selection */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="role" className="text-sm">Role</Label>
              <Select 
                value={formData.role}
                onValueChange={handleRoleChange}
                disabled={loading}
              >
                <SelectTrigger id="role" className="h-9 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value} className="text-sm">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm">Account Status</Label>
              <div className="flex items-center gap-2 h-9 sm:h-10">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="is_active" className="font-normal cursor-pointer text-sm">
                  Active
                </Label>
              </div>
            </div>
          </div>

          {/* Help Text - Collapsible on mobile */}
          <div className="text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2 sm:p-3 rounded">
            <p className="font-medium mb-1">Roles:</p>
            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1">
              <li className="text-xs sm:text-sm"><strong>Viewer:</strong> Read-only access</li>
              <li className="text-xs sm:text-sm"><strong>Technician:</strong> Equipment control</li>
              <li className="text-xs sm:text-sm"><strong>Operator:</strong> Full access</li>
              <li className="text-xs sm:text-sm"><strong>Admin:</strong> System admin</li>
            </ul>
          </div>
        </form>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto text-sm h-9 sm:h-10"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto bg-gradient-primary text-sm h-9 sm:h-10"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
