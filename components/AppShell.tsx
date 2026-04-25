"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import {
  Activity,
  Apple,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/nutrition", label: "Nutrition", icon: Apple },
  { href: "/dashboard/workout", label: "Workout", icon: Dumbbell },
  { href: "/dashboard/admin", label: "Admin", icon: Users, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  const visibleNav = NAV.filter((n) => !n.adminOnly || user?.role === "admin");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — hidden on mobile, shown md+ */}
      <aside className="hidden md:flex w-56 flex-col bg-sidebar p-4 gap-1 fixed m-3 h-[calc(100vh-1.5rem)] rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-2 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10 ring-2 ring-primary/5">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-foreground">MyHealth</span>
        </div>
        <Separator className="mb-2" />

        {visibleNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="mt-auto space-y-2 pt-4">
          <Separator />
          <div className="flex items-center justify-between px-2 py-1">
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user?.username}</p>
              <Badge variant="secondary" className="text-[10px] mt-0.5 capitalize px-1.5 py-0">{user?.role}</Badge>
            </div>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main area — offset accounts for sidebar width (14rem) + its margins (1.5rem) + gap */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold">MyHealth</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/90 backdrop-blur-sm flex items-center justify-around px-2 py-1 z-10">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-11 min-h-11 justify-center transition-colors",
                  active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {item.label}
    </Link>
  );
}
