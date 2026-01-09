"use client";

import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DraftDock } from "@/components/DraftDock";
import { SortableHead, type SortDir } from "@/components/SortableHead";
import { TablePagination } from "@/components/TablePagination";
import { apiFetch, ApiError } from "@/lib/api";
import { applyClientSort } from "@/lib/clientSort";
import { useDraftState } from "@/lib/draft";
import { useSession } from "@/lib/session";
import { hasMinRole } from "@/lib/roles";
import type { Area, Dispositivo, ListResponse } from "@/lib/types";
import Link from "next/link";

const TIPOS_DISPOSITIVO = [
  "Celular",
  "Notebook",
  "Conectividad",
  "Impresora",
  "UPS",
  "PC Escritorio",
  "Otro",
] as const;

export default function DispositivosPage() {
  const { token, user } = useSession();
  const canCreate = hasMinRole(user?.perfil_rol, "Soporte");

  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"id" | "tipo" | "area" | "patrimonio" | "descripcion">("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filterArea, setFilterArea] = useState<string>("all");

  // Modal: nuevo dispositivo
  const [openCreate, setOpenCreate] = useState(false);
  const [minimizedCreate, setMinimizedCreate] = useState(false);
  const draft = useDraftState(
    "dispositivos:new",
    { tipo: "Otro", descripcion: "", idArea: "", nroPatrimonio: "" },
    { storage: "local" }
  );
  const [creating, setCreating] = useState(false);
  const hasDraft =
    draft.value.descripcion.trim().length > 0 ||
    draft.value.nroPatrimonio.trim().length > 0 ||
    draft.value.idArea.trim().length > 0;

  // Modal: editar dispositivo
  const [openEdit, setOpenEdit] = useState(false);
  const [minimizedEdit, setMinimizedEdit] = useState(false);
  const editDraft = useDraftState(
    "dispositivos:edit",
    { id: 0, tipo: "Otro", descripcion: "", idArea: "", nroPatrimonio: "" },
    { storage: "local" }
  );
  const [saving, setSaving] = useState(false);
  const hasEditDraft =
    Boolean(editDraft.value.id) &&
    (editDraft.value.descripcion.trim().length > 0 ||
      editDraft.value.nroPatrimonio.trim().length > 0 ||
      editDraft.value.idArea.trim().length > 0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, d] = await Promise.all([
        apiFetch<ListResponse<Area>>("/areas", { token }),
        apiFetch<ListResponse<Dispositivo>>("/dispositivos", { token }),
      ]);
      setAreas(a.items);
      setItems(d.items);
      setPage(1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudieron cargar los dispositivos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    if (filterArea === "all") return items;
    return items.filter((d) => String(d.id_area) === filterArea);
  }, [items, filterArea]);

  function toggleSort(next: typeof sortKey) {
    if (sortKey !== next) {
      setSortKey(next);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  const sorted = useMemo(() => {
    return applyClientSort(filtered, sortDir, (r) => {
      switch (sortKey) {
        case "id":
          return r.id_equipo;
        case "tipo":
          return r.tipo ?? "Otro";
        case "area":
          return r.area_nombre ?? r.id_area;
        case "patrimonio":
          return r.nro_patrimonio ?? "";
        case "descripcion":
          return r.descripcion ?? "";
      }
    });
  }, [filtered, sortDir, sortKey]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function createDispositivo() {
    setCreating(true);
    setError(null);
    try {
      await apiFetch<{ id_equipo: number }>("/dispositivos", {
        method: "POST",
        token,
        body: {
          tipo: draft.value.tipo,
          descripcion: draft.value.descripcion.trim() || null,
          id_area: Number(draft.value.idArea),
          nro_patrimonio: draft.value.nroPatrimonio.trim() || null,
        },
      });
      draft.clear();
      setOpenCreate(false);
      setMinimizedCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el dispositivo");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(d: Dispositivo) {
    editDraft.setValue({
      id: d.id_equipo,
      tipo: (d.tipo ?? "Otro") as any,
      descripcion: d.descripcion ?? "",
      idArea: String(d.id_area),
      nroPatrimonio: d.nro_patrimonio ?? "",
    });
    setOpenEdit(true);
    setMinimizedEdit(false);
  }

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/dispositivos/${editDraft.value.id}`, {
        method: "PATCH",
        token,
        body: {
          tipo: editDraft.value.tipo,
          descripcion: editDraft.value.descripcion.trim() || null,
          nro_patrimonio: editDraft.value.nroPatrimonio.trim() || null,
          id_area: Number(editDraft.value.idArea),
        },
      });
      editDraft.clear();
      setOpenEdit(false);
      setMinimizedEdit(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo actualizar el dispositivo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AppHeader title="Dispositivos" />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Label>Filtrar por área</Label>
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id_area} value={String(a.id_area)}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canCreate ? (
            <Button
              onClick={() => {
                setOpenCreate(true);
                setMinimizedCreate(false);
              }}
            >
              Nuevo dispositivo
            </Button>
          ) : null}
        </div>

        {!canCreate ? (
          <p className="text-sm text-muted-foreground">Sólo Soporte/Admin puede crear dispositivos.</p>
        ) : null}

        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) setMinimizedCreate(hasDraft);
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo dispositivo</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={String(draft.value.tipo)}
                  onValueChange={(val) => draft.setValue((d) => ({ ...d, tipo: val }))}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DISPOSITIVO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descripción</Label>
                <Input
                  value={draft.value.descripcion}
                  onChange={(e) => draft.setValue((d) => ({ ...d, descripcion: e.target.value }))}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label>Nro. patrimonio</Label>
                <Input
                  value={draft.value.nroPatrimonio}
                  onChange={(e) => draft.setValue((d) => ({ ...d, nroPatrimonio: e.target.value }))}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label>Área</Label>
                <Select
                  value={draft.value.idArea}
                  onValueChange={(val) => draft.setValue((d) => ({ ...d, idArea: val }))}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id_area} value={String(a.id_area)}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpenCreate(false);
                  setMinimizedCreate(hasDraft);
                }}
                disabled={creating}
              >
                Minimizar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  draft.clear();
                  setMinimizedCreate(false);
                  setOpenCreate(false);
                }}
                disabled={creating}
              >
                Descartar
              </Button>
              <Button onClick={createDispositivo} disabled={creating || !draft.value.idArea}>
                {creating ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHead label="ID" active={sortKey === "id"} dir={sortDir} onToggle={() => toggleSort("id")} />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Tipo"
                    active={sortKey === "tipo"}
                    dir={sortDir}
                    onToggle={() => toggleSort("tipo")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Área"
                    active={sortKey === "area"}
                    dir={sortDir}
                    onToggle={() => toggleSort("area")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Patrimonio"
                    active={sortKey === "patrimonio"}
                    dir={sortDir}
                    onToggle={() => toggleSort("patrimonio")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Descripción"
                    active={sortKey === "descripcion"}
                    dir={sortDir}
                    onToggle={() => toggleSort("descripcion")}
                  />
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No hay dispositivos.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((d) => (
                  <TableRow key={d.id_equipo}>
                    <TableCell className="font-medium">
                      <a className="underline underline-offset-2" href={`/dispositivos/${d.id_equipo}`}>
                        {d.id_equipo}
                      </a>
                    </TableCell>
                    <TableCell>{d.tipo ?? "Otro"}</TableCell>
                    <TableCell>{d.area_nombre ?? d.id_area}</TableCell>
                    <TableCell>{d.nro_patrimonio ?? "—"}</TableCell>
                    <TableCell>{d.descripcion ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dispositivos/${d.id_equipo}`}>Ver más</Link>
                        </Button>
                        {canCreate ? (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>
                            Editar
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={safePage}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={[10, 20]}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>

      <DraftDock
        title="Nuevo dispositivo"
        description="Borrador guardado"
        visible={minimizedCreate && hasDraft}
        onRestore={() => {
          setOpenCreate(true);
          setMinimizedCreate(false);
        }}
        onDiscard={() => {
          draft.clear();
          setMinimizedCreate(false);
        }}
      />

      <Dialog
        open={openEdit}
        onOpenChange={(v) => {
          setOpenEdit(v);
          if (!v) setMinimizedEdit(hasEditDraft);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar dispositivo</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={String(editDraft.value.tipo)}
                onValueChange={(val) => editDraft.setValue((d) => ({ ...d, tipo: val as any }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DISPOSITIVO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descripción</Label>
              <Input
                value={editDraft.value.descripcion}
                onChange={(e) => editDraft.setValue((d) => ({ ...d, descripcion: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Nro. patrimonio</Label>
              <Input
                value={editDraft.value.nroPatrimonio}
                onChange={(e) => editDraft.setValue((d) => ({ ...d, nroPatrimonio: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select
                value={editDraft.value.idArea}
                onValueChange={(val) => editDraft.setValue((d) => ({ ...d, idArea: val }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id_area} value={String(a.id_area)}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpenEdit(false);
                setMinimizedEdit(hasEditDraft);
              }}
              disabled={saving}
            >
              Minimizar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                editDraft.clear();
                setMinimizedEdit(false);
                setOpenEdit(false);
              }}
              disabled={saving}
            >
              Descartar
            </Button>
            <Button onClick={saveEdit} disabled={saving || !editDraft.value.idArea}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftDock
        title="Editar dispositivo"
        description={editDraft.value.id ? `ID ${editDraft.value.id}` : undefined}
        visible={minimizedEdit && hasEditDraft}
        onRestore={() => {
          setOpenEdit(true);
          setMinimizedEdit(false);
        }}
        onDiscard={() => {
          editDraft.clear();
          setMinimizedEdit(false);
        }}
        className="bottom-24"
      />
    </div>
  );
}

