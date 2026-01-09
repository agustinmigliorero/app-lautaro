"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { DraftDock } from "@/components/DraftDock";
import { useDraftState } from "@/lib/draft";
import { SortableHead, type SortDir } from "@/components/SortableHead";
import { estadoBadgeClass, prioridadBadgeClass } from "@/lib/badges";
import type { Area, Dispositivo, ListResponse, MeUser, PaginatedResponse, Solicitud } from "@/lib/types";

export default function SolicitudesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useSession();
  const [items, setItems] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total: number; page: number; pageSize: number; counts?: Record<string, number> } | null>(null);

  const filterEstado = searchParams.get("estado") ?? "all";
  const filterFrom = searchParams.get("from") ?? "";
  const filterTo = searchParams.get("to") ?? "";
  const filterPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const filterPageSize = Number(searchParams.get("pageSize") ?? "10") || 10;
  const sortBy = searchParams.get("sortBy") ?? "fecha";
  const sortDir = (searchParams.get("sortDir") ?? "desc") as SortDir;

  function setQuery(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `/solicitudes?${qs}` : "/solicitudes");
  }

  // Modal nueva solicitud (draft persistente)
  const [openNew, setOpenNew] = useState(false);
  const [minimizedNew, setMinimizedNew] = useState(false);
  const canChooseUsuarioSolicitud = user?.perfil_rol === "Soporte" || user?.perfil_rol === "Admin";

  const draft = useDraftState(
    "solicitudes:new",
    {
      descripcionFalla: "",
      prioridad: "Medio",
      idArea: "",
      sinDispositivo: false,
      idEquipo: "",
      usuarioSolicitud: "",
    },
    { storage: "local" }
  );

  const hasDraft =
    draft.value.descripcionFalla.trim().length > 0 ||
    String(draft.value.prioridad || "").trim().length > 0 ||
    String(draft.value.idArea || "").trim().length > 0 ||
    Boolean(draft.value.sinDispositivo) ||
    String(draft.value.idEquipo || "").trim().length > 0 ||
    draft.value.usuarioSolicitud.trim().length > 0;

  const selectedAreaId = String(draft.value.idArea || "");

  const [areas, setAreas] = useState<Area[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [usuarios, setUsuarios] = useState<MeUser[]>([]);
  const [submittingNew, setSubmittingNew] = useState(false);
  const [errorNew, setErrorNew] = useState<string | null>(null);

  useEffect(() => {
    const wantsNew = searchParams.get("new") === "1";
    if (wantsNew) {
      setOpenNew(true);
      setMinimizedNew(false);
    }
  }, [searchParams]);

  useEffect(() => {
    // default solicitante: usuario logueado
    if (user && !draft.value.usuarioSolicitud) {
      draft.setValue((v) => ({ ...v, usuarioSolicitud: String(user.id_usuario) }));
    }
    // default área: área del usuario (se puede borrar para ver todo)
    if (user && !draft.value.idArea) {
      draft.setValue((v) => ({ ...v, idArea: String(user.id_area) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (filterEstado !== "all") qs.set("estado", filterEstado);
        if (filterFrom) qs.set("from", `${filterFrom} 00:00:00`);
        if (filterTo) qs.set("to", `${filterTo} 23:59:59`);
        qs.set("page", String(filterPage));
        qs.set("pageSize", String(filterPageSize));
        if (sortBy) qs.set("sortBy", sortBy);
        if (sortDir) qs.set("sortDir", sortDir);

        const data = await apiFetch<PaginatedResponse<Solicitud>>(`/solicitudes?${qs.toString()}`, { token });
        if (!cancelled) {
          setItems(data.items);
          setMeta(data.meta ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "No se pudo cargar solicitudes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token, filterEstado, filterFrom, filterTo, filterPage, filterPageSize, sortBy, sortDir]);

  function toggleSort(nextBy: string) {
    if (sortBy !== nextBy) {
      setQuery({ sortBy: nextBy, sortDir: "asc", page: "1" });
      return;
    }
    const nextDir = sortDir === "asc" ? "desc" : "asc";
    setQuery({ sortDir: nextDir, page: "1" });
  }

  useEffect(() => {
    // precarga para el modal
    let cancelled = false;
    async function loadModalData() {
      if (!openNew) return;
      try {
        const a = await apiFetch<ListResponse<Area>>("/areas", { token });
        if (!cancelled) setAreas(a.items);
      } catch {
        // ignore
      }

      try {
        const qs = selectedAreaId ? `?id_area=${encodeURIComponent(selectedAreaId)}` : "";
        const d = await apiFetch<ListResponse<Dispositivo>>(`/dispositivos${qs}`, { token });
        if (!cancelled) setDispositivos(d.items);
      } catch {
        // ignore
      }

      if (canChooseUsuarioSolicitud) {
        try {
          const qs = selectedAreaId ? `?id_area=${encodeURIComponent(selectedAreaId)}` : "";
          const u = await apiFetch<ListResponse<MeUser>>(`/usuarios${qs}`, { token });
          if (!cancelled) setUsuarios(u.items);
        } catch {
          // ignore
        }
      }
    }
    loadModalData();
    return () => {
      cancelled = true;
    };
  }, [openNew, token, canChooseUsuarioSolicitud, selectedAreaId]);

  const stats = useMemo(() => {
    const counts = meta?.counts;
    if (counts) {
      return {
        iniciadas: counts["Iniciada"] || 0,
        enProceso: counts["En Proceso"] || 0,
        finalizadas: counts["Finalizada"] || 0,
      };
    }
    const byEstado = new Map<string, number>();
    for (const s of items) byEstado.set(s.estado, (byEstado.get(s.estado) || 0) + 1);
    return {
      iniciadas: byEstado.get("Iniciada") || 0,
      enProceso: byEstado.get("En Proceso") || 0,
      finalizadas: byEstado.get("Finalizada") || 0,
    };
  }, [items]);

  const dispositivosOptions = useMemo(() => {
    return dispositivos.map((d) => ({
      value: String(d.id_equipo),
      label: `${d.id_equipo}${d.nro_patrimonio ? ` · ${d.nro_patrimonio}` : ""}${d.descripcion ? ` · ${d.descripcion}` : ""}`,
    }));
  }, [dispositivos]);

  function closeNewModal() {
    setOpenNew(false);
    setMinimizedNew(hasDraft);
    // limpiamos query param si existía
    if (searchParams.get("new") === "1") router.replace("/solicitudes");
  }

  async function submitNew() {
    setSubmittingNew(true);
    setErrorNew(null);
    try {
      if (!user) throw new Error("Sin usuario");
      const body = {
        descripcion_falla: draft.value.descripcionFalla.trim(),
        usuario_solicitud: Number(draft.value.usuarioSolicitud),
        usuario_generador: Number(user.id_usuario),
        prioridad: draft.value.prioridad,
        id_area: draft.value.idArea ? Number(draft.value.idArea) : null,
        id_equipo: draft.value.sinDispositivo ? null : draft.value.idEquipo ? Number(draft.value.idEquipo) : null,
      };
      const created = await apiFetch<{ id_solicitud: number }>("/solicitudes", {
        method: "POST",
        token,
        body,
      });
      draft.clear();
      setOpenNew(false);
      setMinimizedNew(false);
      router.replace(`/solicitudes/${created.id_solicitud}`);
    } catch (e2) {
      setErrorNew(e2 instanceof ApiError ? e2.message : "No se pudo crear la solicitud");
    } finally {
      setSubmittingNew(false);
    }
  }

  return (
    <div>
      <AppHeader title="Solicitudes" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>
              Iniciadas: <span className="font-medium text-foreground">{stats.iniciadas}</span>
            </span>
            <span>
              En proceso: <span className="font-medium text-foreground">{stats.enProceso}</span>
            </span>
            <span>
              Finalizadas: <span className="font-medium text-foreground">{stats.finalizadas}</span>
            </span>
            {meta ? (
              <span>
                Total: <span className="font-medium text-foreground">{meta.total}</span>
              </span>
            ) : null}
          </div>
          <Button
            onClick={() => {
              setOpenNew(true);
              setMinimizedNew(false);
            }}
          >
            Nueva solicitud
          </Button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filterEstado}
                onValueChange={(v) => setQuery({ estado: v === "all" ? null : v, page: "1" })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Iniciada">Iniciada</SelectItem>
                  <SelectItem value="En Proceso">En Proceso</SelectItem>
                  <SelectItem value="Finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setQuery({ from: e.target.value || null, page: "1" })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setQuery({ to: e.target.value || null, page: "1" })}
              />
            </div>

            <div className="space-y-2">
              <Label>Página</Label>
              <Select
                value={String(filterPageSize)}
                onValueChange={(v) => setQuery({ pageSize: v, page: "1" })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setQuery({ page: String(Math.max(1, filterPage - 1)) })}
              disabled={filterPage <= 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {filterPage}
              {meta ? ` / ${Math.max(1, Math.ceil(meta.total / filterPageSize))}` : ""}
            </span>
            <Button
              variant="outline"
              onClick={() => setQuery({ page: String(filterPage + 1) })}
              disabled={meta ? filterPage * filterPageSize >= meta.total : items.length < filterPageSize}
            >
              Siguiente
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Dialog
          open={openNew}
          onOpenChange={(v) => {
            setOpenNew(v);
            if (!v) closeNewModal();
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva solicitud</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Descripción de la falla</Label>
                <Textarea
                  value={draft.value.descripcionFalla}
                  onChange={(e) => draft.setValue((v) => ({ ...v, descripcionFalla: e.target.value }))}
                  rows={5}
                  disabled={submittingNew}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={String(draft.value.prioridad || "Medio")}
                    onValueChange={(val) => draft.setValue((v) => ({ ...v, prioridad: val }))}
                    disabled={submittingNew}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Muy bajo">Muy bajo</SelectItem>
                      <SelectItem value="Bajo">Bajo</SelectItem>
                      <SelectItem value="Medio">Medio</SelectItem>
                      <SelectItem value="Alto">Alto</SelectItem>
                      <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Área (opcional)</Label>
                  <Select
                    value={selectedAreaId}
                    onValueChange={(val) =>
                      draft.setValue((v) => ({
                        ...v,
                        idArea: val,
                      }))
                    }
                    disabled={submittingNew}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id_area} value={String(a.id_area)}>
                          {a.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Dispositivo (opcional)</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(draft.value.sinDispositivo)}
                        onCheckedChange={(checked) =>
                          draft.setValue((v) => ({
                            ...v,
                            sinDispositivo: checked,
                            idEquipo: checked ? "" : v.idEquipo,
                          }))
                        }
                        disabled={submittingNew}
                      />
                      <span className="text-xs text-muted-foreground">Sin dispositivo</span>
                    </div>
                  </div>

                  {draft.value.sinDispositivo ? (
                    <Input value="—" disabled />
                  ) : dispositivosOptions.length ? (
                    <Select
                      value={String(draft.value.idEquipo || "")}
                      onValueChange={(val) => {
                        draft.setValue((v) => ({ ...v, idEquipo: val }));
                        if (!draft.value.idArea) {
                          const found = dispositivos.find((d) => String(d.id_equipo) === String(val));
                          if (found) draft.setValue((v) => ({ ...v, idArea: String(found.id_area) }));
                        }
                      }}
                      disabled={submittingNew}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dispositivosOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="ID de equipo (ej: 1)"
                      value={String(draft.value.idEquipo || "")}
                      onChange={(e) => draft.setValue((v) => ({ ...v, idEquipo: e.target.value }))}
                      disabled={submittingNew}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Usuario solicitante</Label>
                  {canChooseUsuarioSolicitud && usuarios.length ? (
                    <Select
                      value={draft.value.usuarioSolicitud}
                      onValueChange={(val) => draft.setValue((v) => ({ ...v, usuarioSolicitud: val }))}
                      disabled={submittingNew}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.map((u) => (
                          <SelectItem key={u.id_usuario} value={String(u.id_usuario)}>
                            {u.apellido_nombre} ({u.nombre_usuario})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={draft.value.usuarioSolicitud} disabled />
                  )}
                </div>
              </div>

              {errorNew ? <p className="text-sm text-destructive">{errorNew}</p> : null}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpenNew(false);
                  setMinimizedNew(hasDraft);
                }}
                disabled={submittingNew}
              >
                Minimizar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  draft.clear();
                  setMinimizedNew(false);
                  closeNewModal();
                }}
                disabled={submittingNew}
              >
                Descartar
              </Button>
              <Button
                onClick={submitNew}
                disabled={
                  submittingNew ||
                  draft.value.descripcionFalla.trim().length === 0 ||
                  (!draft.value.sinDispositivo && String(draft.value.idEquipo || "").trim().length === 0) ||
                  draft.value.usuarioSolicitud.trim().length === 0
                }
              >
                {submittingNew ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHead
                    label="ID"
                    active={sortBy === "id_solicitud"}
                    dir={sortDir}
                    onToggle={() => toggleSort("id_solicitud")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Fecha"
                    active={sortBy === "fecha"}
                    dir={sortDir}
                    onToggle={() => toggleSort("fecha")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Estado"
                    active={sortBy === "estado"}
                    dir={sortDir}
                    onToggle={() => toggleSort("estado")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Prioridad"
                    active={sortBy === "prioridad"}
                    dir={sortDir}
                    onToggle={() => toggleSort("prioridad")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Área"
                    active={sortBy === "id_area"}
                    dir={sortDir}
                    onToggle={() => toggleSort("id_area")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Equipo"
                    active={sortBy === "id_equipo"}
                    dir={sortDir}
                    onToggle={() => toggleSort("id_equipo")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Asignado"
                    active={sortBy === "usuario_asignado"}
                    dir={sortDir}
                    onToggle={() => toggleSort("usuario_asignado")}
                  />
                </TableHead>
                <TableHead className="text-right">Ver más</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No hay solicitudes.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((s) => (
                  <TableRow key={s.id_solicitud}>
                    <TableCell className="font-medium">
                      <Link className="underline underline-offset-2" href={`/solicitudes/${s.id_solicitud}`}>
                        {s.id_solicitud}
                      </Link>
                    </TableCell>
                    <TableCell>{new Date(s.fecha).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoBadgeClass(s.estado)}>
                        {s.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={prioridadBadgeClass((s.prioridad ?? "Medio") as any)}
                      >
                        {s.prioridad ?? "Medio"}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.area_nombre ?? s.id_area ?? "—"}</TableCell>
                    <TableCell>{s.id_equipo ?? "—"}</TableCell>
                    <TableCell>{s.usuario_asignado ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/solicitudes/${s.id_solicitud}`}>Ver más</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DraftDock
        title="Nueva solicitud"
        description="Borrador guardado"
        visible={minimizedNew && hasDraft}
        onRestore={() => {
          setOpenNew(true);
          setMinimizedNew(false);
        }}
        onDiscard={() => {
          draft.clear();
          setMinimizedNew(false);
        }}
      />
    </div>
  );
}

