"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { UsuarioListItem } from "@/lib/types";

type UserDetail = UsuarioListItem & { created_at?: string; updated_at?: string };

export default function UsuarioDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token } = useSession();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [stats, setStats] = useState<{
    solicitudes_como_solicitante: number;
    solicitudes_creadas: number;
    solicitudes_asignadas: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ user: UserDetail; stats?: any }>(`/usuarios/${id}`, { token });
        if (!cancelled) {
          setUser(data.user);
          setStats(data.stats ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "No se pudo cargar el usuario");
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
      <AppHeader title={`Usuario #${id}`} />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Detalle</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : !user ? (
              <p className="text-muted-foreground">No encontrado.</p>
            ) : (
              <>
                <div>
                  <span className="text-muted-foreground">Nombre:</span> {user.apellido_nombre}
                </div>
                <div>
                  <span className="text-muted-foreground">Usuario:</span> {user.nombre_usuario}
                </div>
                <div>
                  <span className="text-muted-foreground">Legajo:</span> {user.legajo ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Rol:</span> {user.perfil_rol}
                </div>
                <div>
                  <span className="text-muted-foreground">Área:</span> {user.area_nombre ?? user.id_area}
                </div>
                <div>
                  <span className="text-muted-foreground">Habilitado:</span>{" "}
                  {typeof user.habilitado === "boolean" ? (user.habilitado ? "Sí" : "No") : user.habilitado ? "Sí" : "No"}
                </div>
                {stats ? (
                  <div className="pt-2 text-muted-foreground">
                    Solicitudes (solicitante):{" "}
                    <span className="text-foreground font-medium">{stats.solicitudes_como_solicitante}</span> · Creadas:{" "}
                    <span className="text-foreground font-medium">{stats.solicitudes_creadas}</span> · Asignadas:{" "}
                    <span className="text-foreground font-medium">{stats.solicitudes_asignadas}</span>
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

