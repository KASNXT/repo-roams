// src/components/UserDisplay.tsx
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

export const UserDisplay = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Use initials from username or email
  const initials =
    user.username?.substring(0, 2).toUpperCase() ||
    user.email?.substring(0, 2).toUpperCase() ||
    "U";

  // Role styling configuration
  const roleStyles: Record<string, string> = {
    'superuser': 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 border-red-300 dark:border-red-700',
    'admin': 'bg-orange-100 dark:bg-orange-950 text-orange-900 dark:text-orange-100 border-orange-300 dark:border-orange-700',
    'operator': 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700',
    'technician': 'bg-cyan-100 dark:bg-cyan-950 text-cyan-900 dark:text-cyan-100 border-cyan-300 dark:border-cyan-700',
    'viewer': 'bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100 border-green-300 dark:border-green-700',
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const roleClass = roleStyles[user.role || 'viewer'] || roleStyles['viewer'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        {/* User info */}
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none flex-1">
            <p className="text-sm font-medium">{user.username || user.email}</p>
            <Badge className={`w-fit text-xs ${roleClass}`}>
              {getRoleDisplay(user.role)}
            </Badge>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
