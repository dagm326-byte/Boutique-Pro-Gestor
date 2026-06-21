import { Link, useLocation } from "wouter";
import { useTheme } from "./ThemeProvider";
import {
  Moon,
  Sun,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Menu,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  { name: "Resumen", href: "/resumen", icon: LayoutDashboard },
  { name: "Inventario", href: "/inventario", icon: Package },
  { name: "Ventas", href: "/ventas", icon: ShoppingCart },
  { name: "Compras", href: "/compras", icon: ShoppingBag },
  { name: "Configuracion", href: "/configuracion", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isDark = theme === "dark";
  const sidebarWidth = collapsed ? "w-[64px]" : "w-60";

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navigation.map((item) => {
        const isActive =
          location === item.href || location.startsWith(item.href + "/");
        if (!mobile && collapsed) {
          return (
            <Tooltip key={item.name} delayDuration={100}>
              <TooltipTrigger asChild>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-all cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.name}
              </TooltipContent>
            </Tooltip>
          );
        }
        return (
          <Link key={item.name} href={item.href}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              onClick={() => mobile && setIsMobileMenuOpen(false)}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 border-r border-sidebar-border bg-sidebar z-10 transition-all duration-200",
          sidebarWidth
        )}
      >
        {/* Logo + collapse button */}
        <div className="p-3 flex items-center justify-between min-h-[64px]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-sm shrink-0">
                BP
              </div>
              <div className="min-w-0">
                <p className="text-sidebar-foreground font-bold text-sm leading-tight truncate">
                  Boutique Pro
                </p>
                <p className="text-sidebar-foreground/50 text-xs truncate">
                  Gestion de Boutique
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-sm mx-auto">
              BP
            </div>
          )}
        </div>

        {/* Toggle button */}
        <div
          className={cn(
            "px-3 pb-2",
            collapsed ? "flex justify-center" : ""
          )}
        >
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg px-2 py-1.5 transition-all w-full",
              collapsed ? "justify-center px-0 w-10 h-10 rounded-lg" : ""
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Colapsar menu</span>
              </>
            )}
          </button>
        </div>

        {/* Nav */}
        <div
          className={cn(
            "flex-1 py-2 space-y-0.5",
            collapsed ? "px-2" : "px-3"
          )}
        >
          <NavLinks />
        </div>

        {/* Dark mode toggle */}
        <div className={cn("p-3 border-t border-sidebar-border", collapsed ? "flex justify-center" : "")}>
          {collapsed ? (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {isDark ? "Modo Claro" : "Modo Oscuro"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-foreground hover:bg-sidebar-accent text-sm font-medium cursor-pointer"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun className="w-4 h-4 shrink-0 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 shrink-0" />
              )}
              <span>{isDark ? "Modo Claro" : "Modo Oscuro"}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content — offset by sidebar width */}
      <main
        className={cn(
          "flex-1 flex flex-col min-h-[100dvh] transition-all duration-200",
          collapsed ? "md:pl-[64px]" : "md:pl-60"
        )}
      >
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
              BP
            </div>
            <span className="font-bold text-foreground text-sm">Boutique Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-sidebar">
                <SheetHeader className="p-5 text-left border-b border-sidebar-border">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
                      BP
                    </div>
                    <div>
                      <p className="text-sidebar-foreground font-bold text-sm">
                        Boutique Pro
                      </p>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 p-3 space-y-0.5">
                  <NavLinks mobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
