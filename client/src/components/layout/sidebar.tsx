import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Newspaper,
  Radio,
  Users,
  ShieldCheck,
  LogOut,
  UserCircle,
  Settings
} from "lucide-react";

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Newspaper, label: "Briefing", href: "/briefing" },
    { icon: Radio, label: "Media Lounge", href: "/media" },
    { icon: Users, label: "Community", href: "/community" },
  ];

  if (user?.role === "admin") {
    menuItems.push({ icon: ShieldCheck, label: "Admin", href: "/admin" });
  }

  return (
    <div className={cn("flex h-full flex-col border-r bg-card", className)}>
      <div className="p-6">
        <div className="flex items-center gap-2 font-display font-bold text-2xl text-foreground">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <ShieldCheck size={20} />
          </div>
          Antigravity
        </div>
      </div>

      <div className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors text-sm font-medium",
                location === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon size={20} />
              <span className="silver-text-base">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-4 border-t bg-muted/20">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-2">
          <UserCircle className="text-muted-foreground" size={24} />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-foreground silver-text-base">
              {user?.username}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          className="flex w-full items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}
