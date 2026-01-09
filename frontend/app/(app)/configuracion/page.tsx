"use client";

import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/env";

export default function ConfiguracionPage() {
  const [health, setHealth] = useState<"unknown" | "ok" | "down">("unknown");
  const [clearing, setClearing] = useState(false);

  async function checkHealth() {
    setHealth("unknown");
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      setHealth(res.ok ? "ok" : "down");
    } catch {
      setHealth("down");
    }
  }

  useEffect(() => {
    checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearDrafts() {
    setClearing(true);
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      for (const k of keys) {
        if (k.startsWith("draft:")) window.localStorage.removeItem(k);
      }
    } finally {
      setClearing(false);
    }
  }

  const healthBadge =
    health === "ok"
      ? {
          label: "OK",
          className:
            "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900",
        }
      : health === "down"
      ? {
          label: "Sin conexión",
          className:
            "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900",
        }
      : { label: "—", className: "" };

  return (
    <div>
      <AppHeader title="Configuración" />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Estado del sistema</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">API:</span>
              <code className="text-xs bg-muted/40 px-2 py-1 rounded border">
                {API_BASE_URL}
              </code>
              <Badge variant="outline" className={healthBadge.className}>
                {healthBadge.label}
              </Badge>
              <Button size="sm" variant="outline" onClick={checkHealth}>
                Reintentar
              </Button>
            </div>
            <p className="text-muted-foreground">
              Esta pantalla es para parámetros y herramientas de administración
              (solo Admin).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Herramientas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">Borradores locales</div>
                <div className="text-muted-foreground">
                  Limpia los drafts guardados en el navegador (modales
                  minimizados).
                </div>
              </div>
              <Button
                variant="outline"
                onClick={clearDrafts}
                disabled={clearing}
              >
                {clearing ? "Limpiando..." : "Limpiar borradores"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
