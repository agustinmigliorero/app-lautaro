"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/AppSidebar";
import { useSession } from "@/lib/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <AppSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

