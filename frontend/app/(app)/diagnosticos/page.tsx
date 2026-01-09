"use client";

import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DraftDock } from "@/components/DraftDock";
import { SortableHead, type SortDir } from "@/components/SortableHead";
import { TablePagination } from "@/components/TablePagination";
import { apiFetch, ApiError } from "@/lib/api";
import { applyClientSort } from "@/lib/clientSort";
import { useDraftState } from "@/lib/draft";
import { useSession } from "@/lib/session";
import { hasMinRole } from "@/lib/roles";
import type { Diagnostico, ListResponse } from "@/lib/types";

export default function DiagnosticosPage() {
  const { token, user } = useSession();
  const canCreate = hasMinRole(user?.perfil_rol, "Soporte");

  const [items, setItems] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"id" | "descripcion">("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [openCreate, setOpenCreate] = useState(false);
  const [minimizedCreate, setMinimizedCreate] = useState(false);
  const draft = useDraftState("diagnosticos:new", { descripcion: "" }, { storage: "local" });
  const [creating, setCreating] = useState(false);
  const hasDraft = draft.value.descripcion.trim().length > 0;

  // editar (modal + borrador)
  const [openEdit, setOpenEdit] = useState(false);
  const [minimizedEdit, setMinimizedEdit] = useState(false);
  const editDraft = useDraftState(
    "diagnosticos:edit",
    { id: 0, descripcion: "" },
    { storage: "local" }
  );
  const [saving, setSaving] = useState(false);
  const hasEditDraft = Boolean(editDraft.value.id) && editDraft.value.descripcion.trim().length > 0;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ListResponse<Diagnostico>>("/diagnosticos", { token });
      setItems(data.items);
      setPage(1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudieron cargar diagnósticos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function createDiagnostico() {
    setCreating(true);
    setError(null);
    try {
      await apiFetch<{ id_diagnostico: number }>("/diagnosticos", {
        method: "POST",
        token,
        body: { descripcion: draft.value.descripcion.trim() },
      });
      draft.clear();
      setOpenCreate(false);
      setMinimizedCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el diagnóstico");
    } finally {
      setCreating(false);
    }
  }

  function toggleSort(next: "id" | "descripcion") {
    if (sortKey !== next) {
      setSortKey(next);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  const sorted = applyClientSort(items, sortDir, (r) =>
    sortKey === "id" ? r.id_diagnostico : r.descripcion
  );

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function startEdit(d: Diagnostico) {
    editDraft.setValue({ id: d.id_diagnostico, descripcion: d.descripcion });
    setOpenEdit(true);
    setMinimizedEdit(false);
  }

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/diagnosticos/${editDraft.value.id}`, {
        method: "PATCH",
        token,
        body: { descripcion: editDraft.value.descripcion.trim() },
      });
      editDraft.clear();
      setOpenEdit(false);
      setMinimizedEdit(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo actualizar el diagnóstico");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AppHeader title="Diagnósticos" />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {canCreate ? "Catálogo de diagnósticos." : "Sólo Soporte/Admin puede crear diagnósticos."}
          </p>
          {canCreate ? (
            <Button
              onClick={() => {
                setOpenCreate(true);
                setMinimizedCreate(false);
              }}
            >
              Nuevo diagnóstico
            </Button>
          ) : null}
        </div>

        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) setMinimizedCreate(hasDraft);
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Nuevo diagnóstico</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={draft.value.descripcion}
                onChange={(e) => draft.setValue({ descripcion: e.target.value })}
                disabled={creating}
              />
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
              <Button onClick={createDiagnostico} disabled={creating || draft.value.descripcion.trim().length === 0}>
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
                  <SortableHead
                    label="ID"
                    active={sortKey === "id"}
                    dir={sortDir}
                    onToggle={() => toggleSort("id")}
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
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No hay diagnósticos.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((d) => (
                  <TableRow key={d.id_diagnostico}>
                    <TableCell className="font-medium">{d.id_diagnostico}</TableCell>
                    <TableCell>{d.descripcion}</TableCell>
                    <TableCell className="text-right">
                      {canCreate ? (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>
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
        title="Nuevo diagnóstico"
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar diagnóstico</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              value={editDraft.value.descripcion}
              onChange={(e) => editDraft.setValue((x) => ({ ...x, descripcion: e.target.value }))}
              disabled={saving}
            />
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
            <Button onClick={saveEdit} disabled={saving || editDraft.value.descripcion.trim().length === 0}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftDock
        title="Editar diagnóstico"
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

