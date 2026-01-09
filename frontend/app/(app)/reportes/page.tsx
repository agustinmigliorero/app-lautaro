"use client";

import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/BarChart";
import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { prioridadBadgeClass, estadoBadgeClass } from "@/lib/badges";

type Summary = {
  totals: {
    solicitudes_total: number;
    usuarios_total: number;
    usuarios_habilitados: number;
    dispositivos_total: number;
    areas_total: number;
    componentes_total: number;
  };
  solicitudes: {
    por_estado: { estado: string; total: number }[];
    por_prioridad: { prioridad: string; total: number }[];
    por_resolucion_metodo: { resolucion_metodo: string; total: number }[];
  };
  dispositivos: { por_tipo: { tipo: string; total: number }[] };
  componentes: { por_tipo: { tipo: string; total: number }[] };
  areas: {
    top: { id_area: number; nombre: string; usuarios_total: number; dispositivos_total: number; solicitudes_total: number }[];
  };
};

export default function ReportesPage() {
  const { token, user } = useSession();
  const canSee = user?.perfil_rol === "Soporte" || user?.perfil_rol === "Admin";

  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!canSee) return;
      setLoading(true);
      setError(null);
      try {
        const d = await apiFetch<Summary>("/reportes/summary", { token });
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "No se pudieron cargar reportes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token, canSee]);

  const estadoData = useMemo(() => {
    const rows = data?.solicitudes.por_estado ?? [];
    return rows.map((r) => ({
      label: r.estado,
      value: Number(r.total) || 0,
      colorClassName:
        r.estado === "Finalizada"
          ? "bg-emerald-500/70"
          : r.estado === "En Proceso"
            ? "bg-amber-500/70"
            : "bg-sky-500/70",
    }));
  }, [data]);

  const prioridadData = useMemo(() => {
    const rows = data?.solicitudes.por_prioridad ?? [];
    return rows.map((r) => ({
      label: r.prioridad,
      value: Number(r.total) || 0,
      colorClassName:
        r.prioridad === "Urgente"
          ? "bg-red-500/70"
          : r.prioridad === "Alto"
            ? "bg-orange-500/70"
            : r.prioridad === "Medio"
              ? "bg-amber-500/70"
              : r.prioridad === "Bajo"
                ? "bg-sky-500/70"
                : "bg-slate-500/70",
    }));
  }, [data]);

  const dispTipoData = useMemo(() => {
    const rows = data?.dispositivos.por_tipo ?? [];
    return rows.map((r) => ({ label: r.tipo, value: Number(r.total) || 0, colorClassName: "bg-indigo-500/70" }));
  }, [data]);

  const compTipoData = useMemo(() => {
    const rows = data?.componentes.por_tipo ?? [];
    return rows.map((r) => ({ label: r.tipo, value: Number(r.total) || 0, colorClassName: "bg-violet-500/70" }));
  }, [data]);

  if (!canSee) {
    return (
      <div>
        <AppHeader title="Reportes" />
        <div className="p-6 text-sm text-muted-foreground">No tenés permisos para ver esta pantalla.</div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Reportes" />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            ["Solicitudes", data?.totals.solicitudes_total],
            ["Usuarios", data?.totals.usuarios_total],
            ["Usuarios habilitados", data?.totals.usuarios_habilitados],
            ["Dispositivos", data?.totals.dispositivos_total],
            ["Áreas", data?.totals.areas_total],
            ["Componentes", data?.totals.componentes_total],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">
                {loading ? "—" : String(value ?? 0)}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <BarChart title="Por estado" data={estadoData} />
              <BarChart title="Por prioridad" data={prioridadData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <BarChart title="Dispositivos por tipo" data={dispTipoData} />
              <BarChart title="Componentes por tipo" data={compTipoData} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top áreas (actividad)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Área</TableHead>
                      <TableHead>Solicitudes</TableHead>
                      <TableHead>Dispositivos</TableHead>
                      <TableHead>Usuarios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          Cargando...
                        </TableCell>
                      </TableRow>
                    ) : (data?.areas.top?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          Sin datos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data!.areas.top.map((a) => (
                        <TableRow key={a.id_area}>
                          <TableCell className="font-medium">{a.nombre}</TableCell>
                          <TableCell className="tabular-nums">{a.solicitudes_total}</TableCell>
                          <TableCell className="tabular-nums">{a.dispositivos_total}</TableCell>
                          <TableCell className="tabular-nums">{a.usuarios_total}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolución (solo finalizadas)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BarChart
                title="Método de resolución"
                data={(data?.solicitudes.por_resolucion_metodo ?? []).map((r) => ({
                  label: r.resolucion_metodo,
                  value: Number(r.total) || 0,
                  colorClassName: "bg-emerald-500/70",
                }))}
              />
              <div className="text-xs text-muted-foreground">
                Tip: estos datos aparecen cuando el ticket está Finalizado y se selecciona el método.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Referencias visuales</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {(["Iniciada", "En Proceso", "Finalizada"] as const).map((e) => (
              <Badge key={e} variant="outline" className={estadoBadgeClass(e as any)}>
                {e}
              </Badge>
            ))}
            {(["Muy bajo", "Bajo", "Medio", "Alto", "Urgente"] as const).map((p) => (
              <Badge key={p} variant="outline" className={prioridadBadgeClass(p as any)}>
                {p}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

