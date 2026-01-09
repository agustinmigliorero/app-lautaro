"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Area } from "@/lib/types";

export default function AreaDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token } = useSession();

  const [area, setArea] = useState<Area | null>(null);
  const [stats, setStats] = useState<{ usuarios_total: number; dispositivos_total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ area: Area; stats?: { usuarios_total: number; dispositivos_total: number } }>(
          `/areas/${id}`,
          { token }
        );
        if (!cancelled) {
          setArea(data.area);
          setStats(data.stats ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "No se pudo cargar el área");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (Number.isFinite(id)) run();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  return (
    <div>
      <AppHeader title={`Área #${id}`} />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Detalle</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : !area ? (
              <p className="text-muted-foreground">No encontrado.</p>
            ) : (
              <>
                <div>
                  <span className="text-muted-foreground">Nombre:</span> {area.nombre}
                </div>
                <div>
                  <span className="text-muted-foreground">Descripción:</span> {area.descripcion ?? "—"}
                </div>
                {stats ? (
                  <div className="pt-2 text-muted-foreground">
                    Usuarios: <span className="text-foreground font-medium">{stats.usuarios_total}</span> · Dispositivos:{" "}
                    <span className="text-foreground font-medium">{stats.dispositivos_total}</span>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

