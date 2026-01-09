"use client";

import { useSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";

export function AppHeader({ title }: { title: string }) {
  const { user } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
        {user ? (
          <p className="text-xs text-muted-foreground truncate">
            {user.apellido_nombre} · {user.nombre_usuario}
          </p>
        ) : null}
      </div>
      {user ? <Badge variant="secondary">{user.perfil_rol}</Badge> : null}
    </header>
  );
}

