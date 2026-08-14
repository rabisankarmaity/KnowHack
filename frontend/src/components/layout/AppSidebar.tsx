import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Compass, Upload, User, Bell, Settings, LogOut, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onNavigate?.();
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <div className="px-3">
        <div className="mb-4 rounded-xl border border-border/60 bg-gradient-to-br from-primary/10 to-accent/10 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Pro trial</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">14 days left. Unlock private vaults.</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{it.label}</span>
              {it.label === "Notifications" && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  3
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}