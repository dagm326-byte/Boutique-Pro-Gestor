import { Link, useLocation } from "wouter";
import { useTheme } from "./ThemeProvider";
import { Moon, Sun, LayoutDashboard, Package, ShoppingCart, Settings, Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

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

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const isActive = location === item.href || location.startsWith(item.href + "/");
        return (
          <Link key={item.name} href={item.href}>
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer text-sm font-medium ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </div>
          </Link>
        );
      })}
    </>
  );

  const isDark = theme === "dark";

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0 border-r border-sidebar-border bg-sidebar z-10">
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-sm">
            BP
          </div>
          <div>
            <p className="text-sidebar-foreground font-bold text-sm leading-tight">Boutique Pro</p>
            <p className="text-sidebar-foreground/50 text-xs">Gestion de Boutique</p>
          </div>
        </div>

        <div className="flex-1 px-3 space-y-0.5 py-2">
          <NavLinks />
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-foreground hover:bg-sidebar-accent text-sm font-medium cursor-pointer"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark
              ? <Sun className="w-4 h-4 shrink-0 text-amber-400" />
              : <Moon className="w-4 h-4 shrink-0" />
            }
            <span>{isDark ? "Modo Claro" : "Modo Oscuro"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-60 flex flex-col min-h-[100dvh]">
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
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
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
                      <p className="text-sidebar-foreground font-bold text-sm">Boutique Pro</p>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 p-3 space-y-0.5">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
