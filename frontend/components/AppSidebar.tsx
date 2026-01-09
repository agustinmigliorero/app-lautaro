"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Cpu, LogOut, MapPinned, Settings, Stethoscope, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/session";
import { hasMinRole } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: React.ReactNode; minRole?: "Soporte" | "Admin" };

function canSee(role: string, minRole?: "Soporte" | "Admin") {
  if (!minRole) return true;
  if (minRole === "Soporte") return hasMinRole(role as any, "Soporte");
  return hasMinRole(role as any, "Admin");
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const role = user?.perfil_rol ?? "Empleado";

  const nav: NavItem[] = [
    { href: "/solicitudes", label: "Solicitudes", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/reportes", label: "Reportes", icon: <BarChart3 className="h-4 w-4" />, minRole: "Soporte" },
    { href: "/usuarios", label: "Usuarios", icon: <Users className="h-4 w-4" />, minRole: "Soporte" },
    { href: "/areas", label: "Áreas", icon: <MapPinned className="h-4 w-4" />, minRole: "Soporte" },
    { href: "/dispositivos", label: "Dispositivos", icon: <Cpu className="h-4 w-4" />, minRole: "Soporte" },
    { href: "/diagnosticos", label: "Diagnósticos", icon: <Stethoscope className="h-4 w-4" />, minRole: "Soporte" },
    { href: "/configuracion", label: "Configuración", icon: <Settings className="h-4 w-4" />, minRole: "Admin" },
  ];

  return (
    <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground shadow-sm">
      <div className="flex h-16 items-center px-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-4">Mesa de Ayuda</span>
          <span className="text-xs text-muted-foreground leading-4">
            {user ? `${user.apellido_nombre} · ${role}` : "—"}
          </span>
        </div>
      </div>
      <Separator />
      <nav className="p-2 space-y-1">
        {nav
          .filter((i) => canSee(role, i.minRole))
          .map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 border border-transparent",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border font-medium"
                )}
              >
                <Link href={item.href}>
                  {item.icon}
                  {item.label}
                </Link>
              </Button>
            );
          })}
      </nav>
      <div className="mt-auto p-2">
        <Separator className="mb-2" />
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </div>
    </aside>
  );
}

