"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DraftDock } from "@/components/DraftDock";
import { apiFetch, ApiError } from "@/lib/api";
import { useDraftState } from "@/lib/draft";
import { useSession } from "@/lib/session";
import type { Area, Dispositivo, DispositivoComponente, ListResponse } from "@/lib/types";

const TIPOS_DISPOSITIVO = [
  "Celular",
  "Notebook",
  "Conectividad",
  "Impresora",
  "UPS",
  "PC Escritorio",
  "Otro",
] as const;

export default function DispositivoDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token, user } = useSession();
  const canEdit = user?.perfil_rol === "Soporte" || user?.perfil_rol === "Admin";

  const [dispositivo, setDispositivo] = useState<Dispositivo | null>(null);
  const [componentes, setComponentes] = useState<DispositivoComponente[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal editar dispositivo
  const [openEdit, setOpenEdit] = useState(false);
  const [minimizedEdit, setMinimizedEdit] = useState(false);
  const editDraft = useDraftState(
    `dispositivos:${id}:edit`,
    { tipo: "Otro", descripcion: "", idArea: "", nroPatrimonio: "" },
    { storage: "local" }
  );
  const [saving, setSaving] = useState(false);
  const hasEditDraft =
    editDraft.value.descripcion.trim().length > 0 ||
    editDraft.value.nroPatrimonio.trim().length > 0 ||
    editDraft.value.idArea.trim().length > 0;

  // Modal crear componente (dentro del dispositivo)
  const [openNewComp, setOpenNewComp] = useState(false);
  const [minimizedNewComp, setMinimizedNewComp] = useState(false);
  const newCompDraft = useDraftState(
    `dispositivos:${id}:componentes:new`,
    { tipo: "Hardware" as const, detalle: "" },
    { storage: "local" }
  );
  const [creatingComp, setCreatingComp] = useState(false);
  const hasNewCompDraft = newCompDraft.value.detalle.trim().length > 0;

  // Modal editar componente
  const [openEditComp, setOpenEditComp] = useState(false);
  const [minimizedEditComp, setMinimizedEditComp] = useState(false);
  const editCompDraft = useDraftState(
    `dispositivos:${id}:componentes:edit`,
    { id: 0, tipo: "Hardware" as "Hardware" | "Software" | "Periférico", detalle: "" },
    { storage: "local" }
  );
  const [savingComp, setSavingComp] = useState(false);
  const hasEditCompDraft = Boolean(editCompDraft.value.id) && editCompDraft.value.detalle.trim().length > 0;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a] = await Promise.all([apiFetch<ListResponse<Area>>("/areas", { token })]);
      setAreas(a.items);

      const d = await apiFetch<{ dispositivo: Dispositivo; componentes: DispositivoComponente[] }>(`/dispositivos/${id}`, { token });
      setDispositivo(d.dispositivo);
      setComponentes(d.componentes);

      // precarga draft de edición con estado actual
      editDraft.setValue({
        tipo: (d.dispositivo.tipo ?? "Otro") as any,
        descripcion: d.dispositivo.descripcion ?? "",
        idArea: String(d.dispositivo.id_area),
        nroPatrimonio: d.dispositivo.nro_patrimonio ?? "",
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cargar el dispositivo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const componentesSorted = useMemo(() => [...componentes].sort((a, b) => b.id_componente - a.id_componente), [componentes]);

  async function saveDevice() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/dispositivos/${id}`, {
        method: "PATCH",
        token,
        body: {
          tipo: editDraft.value.tipo,
          descripcion: editDraft.value.descripcion.trim() || null,
          nro_patrimonio: editDraft.value.nroPatrimonio.trim() || null,
          id_area: Number(editDraft.value.idArea),
        },
      });
      setOpenEdit(false);
      setMinimizedEdit(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function deleteComponent(id_componente: number) {
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/dispositivos/${id}/componentes/${id_componente}`, {
        method: "DELETE",
        token,
        body: {},
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo eliminar el componente");
    }
  }

  async function createComponent() {
    setCreatingComp(true);
    setError(null);
    try {
      await apiFetch<{ id_componente: number }>(`/dispositivos/${id}/componentes`, {
        method: "POST",
        token,
        body: { tipo: newCompDraft.value.tipo, detalle: newCompDraft.value.detalle.trim() },
      });
      newCompDraft.clear();
      setOpenNewComp(false);
      setMinimizedNewComp(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el componente");
    } finally {
      setCreatingComp(false);
    }
  }

  function startEditComponent(c: DispositivoComponente) {
    editCompDraft.setValue({ id: c.id_componente, tipo: c.tipo, detalle: c.detalle });
    setOpenEditComp(true);
    setMinimizedEditComp(false);
  }

  async function saveComponent() {
    setSavingComp(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/dispositivos/${id}/componentes/${editCompDraft.value.id}`, {
        method: "PATCH",
        token,
        body: { tipo: editCompDraft.value.tipo, detalle: editCompDraft.value.detalle.trim() },
      });
      editCompDraft.clear();
      setOpenEditComp(false);
      setMinimizedEditComp(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar el componente");
    } finally {
      setSavingComp(false);
    }
  }

  return (
    <div>
      <AppHeader title={`Dispositivo #${id}`} />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalle</CardTitle>
            {canEdit ? (
              <Button
                variant="outline"
                onClick={() => {
                  setOpenEdit(true);
                  setMinimizedEdit(false);
                }}
                disabled={loading}
              >
                Editar
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : !dispositivo ? (
              <p className="text-muted-foreground">No encontrado.</p>
            ) : (
              <>
                <div>
                  <span className="text-muted-foreground">Tipo:</span> {dispositivo.tipo ?? "Otro"}
                </div>
                <div>
                  <span className="text-muted-foreground">Área:</span> {dispositivo.area_nombre ?? dispositivo.id_area}
                </div>
                <div>
                  <span className="text-muted-foreground">Patrimonio:</span> {dispositivo.nro_patrimonio ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Descripción:</span> {dispositivo.descripcion ?? "—"}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Componentes</CardTitle>
            {canEdit ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setOpenNewComp(true);
                    setMinimizedNewComp(false);
                  }}
                  disabled={loading}
                >
                  Nuevo componente
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : componentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        Sin componentes asignados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    componentesSorted.map((c) => (
                      <TableRow key={`${c.id_equipo}-${c.id_componente}`}>
                        <TableCell className="font-medium">{c.id_componente}</TableCell>
                        <TableCell>{c.tipo}</TableCell>
                        <TableCell>{c.detalle}</TableCell>
                        <TableCell className="text-right">
                          {canEdit ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEditComponent(c)}>
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteComponent(c.id_componente)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          ) : (
                            "—"
                          )}
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

      {/* Editar dispositivo */}
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Descripción</Label>
              <Input
                value={editDraft.value.descripcion}
                onChange={(e) => editDraft.setValue((d) => ({ ...d, descripcion: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Nro. patrimonio</Label>
              <Input
                value={editDraft.value.nroPatrimonio}
                onChange={(e) => editDraft.setValue((d) => ({ ...d, nroPatrimonio: e.target.value }))}
                disabled={saving}
              />
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
            <Button onClick={saveDevice} disabled={saving || !editDraft.value.idArea}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftDock
        title="Editar dispositivo"
        description={`ID ${id}`}
        visible={minimizedEdit && hasEditDraft}
        onRestore={() => {
          setOpenEdit(true);
          setMinimizedEdit(false);
        }}
        onDiscard={() => {
          editDraft.clear();
          setMinimizedEdit(false);
        }}
        className="bottom-4"
      />

      {/* Editar componente */}
      <Dialog
        open={openEditComp}
        onOpenChange={(v) => {
          setOpenEditComp(v);
          if (!v) setMinimizedEditComp(hasEditCompDraft);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar componente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={editCompDraft.value.tipo}
                onValueChange={(val) => editCompDraft.setValue((d) => ({ ...d, tipo: val as any }))}
                disabled={savingComp}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hardware">Hardware</SelectItem>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Periférico">Periférico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalle</Label>
              <Input
                value={editCompDraft.value.detalle}
                onChange={(e) => editCompDraft.setValue((d) => ({ ...d, detalle: e.target.value }))}
                disabled={savingComp}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpenEditComp(false);
                setMinimizedEditComp(hasEditCompDraft);
              }}
              disabled={savingComp}
            >
              Minimizar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                editCompDraft.clear();
                setMinimizedEditComp(false);
                setOpenEditComp(false);
              }}
              disabled={savingComp}
            >
              Descartar
            </Button>
            <Button onClick={saveComponent} disabled={savingComp || editCompDraft.value.detalle.trim().length === 0}>
              {savingComp ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftDock
        title="Editar componente"
        description={editCompDraft.value.id ? `ID ${editCompDraft.value.id}` : undefined}
        visible={minimizedEditComp && hasEditCompDraft}
        onRestore={() => {
          setOpenEditComp(true);
          setMinimizedEditComp(false);
        }}
        onDiscard={() => {
          editCompDraft.clear();
          setMinimizedEditComp(false);
        }}
        className="bottom-24"
      />

      {/* Crear componente */}
      <Dialog
        open={openNewComp}
        onOpenChange={(v) => {
          setOpenNewComp(v);
          if (!v) setMinimizedNewComp(hasNewCompDraft);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo componente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newCompDraft.value.tipo}
                onValueChange={(val) => newCompDraft.setValue((d) => ({ ...d, tipo: val as any }))}
                disabled={creatingComp}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hardware">Hardware</SelectItem>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Periférico">Periférico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalle</Label>
              <Input
                value={newCompDraft.value.detalle}
                onChange={(e) => newCompDraft.setValue((d) => ({ ...d, detalle: e.target.value }))}
                disabled={creatingComp}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpenNewComp(false);
                setMinimizedNewComp(hasNewCompDraft);
              }}
              disabled={creatingComp}
            >
              Minimizar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                newCompDraft.clear();
                setMinimizedNewComp(false);
                setOpenNewComp(false);
              }}
              disabled={creatingComp}
            >
              Descartar
            </Button>
            <Button onClick={createComponent} disabled={creatingComp || newCompDraft.value.detalle.trim().length === 0}>
              {creatingComp ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftDock
        title="Nuevo componente"
        description={`Dispositivo #${id}`}
        visible={minimizedNewComp && hasNewCompDraft}
        onRestore={() => {
          setOpenNewComp(true);
          setMinimizedNewComp(false);
        }}
        onDiscard={() => {
          newCompDraft.clear();
          setMinimizedNewComp(false);
        }}
        className="bottom-44"
      />
    </div>
  );
}

