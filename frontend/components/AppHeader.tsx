"use client";

import { useSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";

export function AppHeader({ title }: { title: string }) {
  const { user } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      {user ? <Badge variant="secondary">{user.perfil_rol}</Badge> : null}
    </header>
  );
}

