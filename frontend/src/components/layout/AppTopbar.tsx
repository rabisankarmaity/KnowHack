import { useState } from "react";
import { Search, Bell, Menu, Plus, LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/project-vm";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate({ to: "/discover", search: q ? { q } : {} } as never);
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  };

  const avatarLabel = (user?.avatar || initials(user?.name)).slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur md:px-6">
      <button
        onClick={onOpenSidebar}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <form onSubmit={handleSearchSubmit} className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, tech, hackathons…"
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-16 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" className="gradient-bg text-white hover:opacity-95">
          <Link to="/upload">
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </Button>
        <Link
          to="/notifications"
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="grid h-9 w-9 place-items-center rounded-full gradient-bg text-xs font-semibold text-white"
              aria-label="Account menu"
            >
              {avatarLabel}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {user && (
              <>
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">@{user.username}</div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}