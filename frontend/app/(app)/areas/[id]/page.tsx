"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Area, Dispositivo, UsuarioListItem } from "@/lib/types";

export default function AreaDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token } = useSession();

  const [area, setArea] = useState<Area | null>(null);
  const [stats, setStats] = useState<{ usuarios_total: number; dispositivos_total: number } | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioListItem[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{
          area: Area;
          stats?: { usuarios_total: number; dispositivos_total: number };
          usuarios?: UsuarioListItem[];
          dispositivos?: Dispositivo[];
        }>(`/areas/${id}`, { token });
        if (!cancelled) {
          setArea(data.area);
          setStats(data.stats ?? null);
          setUsuarios(data.usuarios ?? []);
          setDispositivos(data.dispositivos ?? []);
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

        <Card>
          <CardHeader>
            <CardTitle>Usuarios del área</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Ver más</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        {stats?.usuarios_total ? "No hay permisos para listar usuarios." : "No hay usuarios."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((u) => (
                      <TableRow key={u.id_usuario}>
                        <TableCell className="font-medium">{u.id_usuario}</TableCell>
                        <TableCell>{u.apellido_nombre}</TableCell>
                        <TableCell>{u.nombre_usuario}</TableCell>
                        <TableCell>{u.perfil_rol}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/usuarios/${u.id_usuario}`}>Ver más</Link>
                          </Button>
                        </TableCell>
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
            <CardTitle>Dispositivos del área</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Patrimonio</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Ver más</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : dispositivos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No hay dispositivos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dispositivos.map((d) => (
                      <TableRow key={d.id_equipo}>
                        <TableCell className="font-medium">{d.id_equipo}</TableCell>
                        <TableCell>{d.tipo ?? "Otro"}</TableCell>
                        <TableCell>{d.nro_patrimonio ?? "—"}</TableCell>
                        <TableCell>{d.descripcion ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dispositivos/${d.id_equipo}`}>Ver más</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

