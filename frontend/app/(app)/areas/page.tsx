"use client";

import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DraftDock } from "@/components/DraftDock";
import { TablePagination } from "@/components/TablePagination";
import { apiFetch, ApiError } from "@/lib/api";
import { useDraftState } from "@/lib/draft";
import { useSession } from "@/lib/session";
import { hasMinRole } from "@/lib/roles";
import type { Area, ListResponse } from "@/lib/types";

export default function AreasPage() {
  const { token, user } = useSession();
  const isAdmin = hasMinRole(user?.perfil_rol, "Admin");

  const [items, setItems] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal: nueva área (draft persistente)
  const [openCreate, setOpenCreate] = useState(false);
  const [minimizedCreate, setMinimizedCreate] = useState(false);
  const createDraft = useDraftState(
    "areas:new",
    { nombre: "", descripcion: "" },
    { storage: "local" }
  );
  const [creating, setCreating] = useState(false);
  const hasCreateDraft =
    createDraft.value.nombre.trim().length > 0 || createDraft.value.descripcion.trim().length > 0;

  // Modal: editar área (draft en memoria + dock)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [minimizedEdit, setMinimizedEdit] = useState(false);
  const [editDraft, setEditDraft] = useState<{ nombre: string; descripcion: string }>({
    nombre: "",
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ListResponse<Area>>("/areas", { token });
      setItems(data.items);
      setPage(1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudieron cargar las áreas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const byId = useMemo(() => new Map(items.map((a) => [a.id_area, a])), [items]);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function createArea() {
    setCreating(true);
    setError(null);
    try {
      await apiFetch<{ id_area: number }>("/areas", {
        method: "POST",
        token,
        body: {
          nombre: createDraft.value.nombre.trim(),
          descripcion: createDraft.value.descripcion.trim() || null,
        },
      });
      createDraft.clear();
      setOpenCreate(false);
      setMinimizedCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el área");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(id_area: number) {
    const a = byId.get(id_area);
    if (!a) return;
    setEditingId(id_area);
    setEditDraft({ nombre: a.nombre, descripcion: a.descripcion || "" });
    setOpenEdit(true);
    setMinimizedEdit(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({ nombre: "", descripcion: "" });
    setOpenEdit(false);
    setMinimizedEdit(false);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/areas/${editingId}`, {
        method: "PATCH",
        token,
        body: {
          nombre: editDraft.nombre.trim() || undefined,
          descripcion: editDraft.descripcion.trim(),
        },
      });
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo actualizar el área");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AppHeader title="Áreas" />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {isAdmin ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Administración de áreas.</p>
            <Button
              onClick={() => {
                setOpenCreate(true);
                setMinimizedCreate(false);
              }}
            >
              Nueva área
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sólo Admin puede crear/editar áreas.</p>
        )}

        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) setMinimizedCreate(hasCreateDraft);
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Nueva área</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={createDraft.value.nombre}
                  onChange={(e) => createDraft.setValue((d) => ({ ...d, nombre: e.target.value }))}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={createDraft.value.descripcion}
                  onChange={(e) => createDraft.setValue((d) => ({ ...d, descripcion: e.target.value }))}
                  disabled={creating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpenCreate(false);
                  setMinimizedCreate(hasCreateDraft);
                }}
                disabled={creating}
              >
                Minimizar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  createDraft.clear();
                  setMinimizedCreate(false);
                  setOpenCreate(false);
                }}
                disabled={creating}
              >
                Descartar
              </Button>
              <Button onClick={createArea} disabled={creating || createDraft.value.nombre.trim().length === 0}>
                {creating ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openEdit}
          onOpenChange={(v) => {
            setOpenEdit(v);
            if (!v) setMinimizedEdit(Boolean(editingId));
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Editar área</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editDraft.nombre}
                  onChange={(e) => setEditDraft((d) => ({ ...d, nombre: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={editDraft.descripcion}
                  onChange={(e) => setEditDraft((d) => ({ ...d, descripcion: e.target.value }))}
                  disabled={saving}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpenEdit(false);
                  setMinimizedEdit(Boolean(editingId));
                }}
                disabled={saving}
              >
                Minimizar
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                Descartar
              </Button>
              <Button onClick={saveEdit} disabled={saving || editDraft.nombre.trim().length === 0}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
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
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No hay áreas.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((a) => (
                  <TableRow key={a.id_area}>
                    <TableCell className="font-medium">{a.id_area}</TableCell>
                    <TableCell>{a.nombre}</TableCell>
                    <TableCell className="max-w-[520px]">{a.descripcion || "—"}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(a.id_area)}>
                          Editar
                        </Button>
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
        title="Nueva área"
        description="Borrador guardado"
        visible={minimizedCreate && hasCreateDraft}
        onRestore={() => {
          setOpenCreate(true);
          setMinimizedCreate(false);
        }}
        onDiscard={() => {
          createDraft.clear();
          setMinimizedCreate(false);
        }}
      />

      <DraftDock
        title="Editar área"
        description={editingId ? `Área #${editingId}` : undefined}
        visible={minimizedEdit && Boolean(editingId)}
        onRestore={() => {
          setOpenEdit(true);
          setMinimizedEdit(false);
        }}
        onDiscard={cancelEdit}
        className="bottom-24"
      />
    </div>
  );
}

