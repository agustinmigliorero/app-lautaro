 "use client";

import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DraftDock } from "@/components/DraftDock";
import { SortableHead, type SortDir } from "@/components/SortableHead";
import { TablePagination } from "@/components/TablePagination";
import { apiFetch, ApiError } from "@/lib/api";
import { useDraftState } from "@/lib/draft";
import { applyClientSort } from "@/lib/clientSort";
import { hasMinRole } from "@/lib/roles";
import { useSession } from "@/lib/session";
import type { Area, ListResponse, Role, UsuarioListItem } from "@/lib/types";
import Link from "next/link";

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  return Boolean(v);
}

export default function UsuariosPage() {
  const { token, user } = useSession();
  const canSee = hasMinRole(user?.perfil_rol, "Soporte");
  const isAdmin = hasMinRole(user?.perfil_rol, "Admin");

  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<UsuarioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<
    "id" | "legajo" | "nombre" | "usuario" | "area" | "rol" | "habilitado"
  >("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal: crear usuario (draft persistente, EXCEPTO password)
  const [openCreate, setOpenCreate] = useState(false);
  const [minimizedCreate, setMinimizedCreate] = useState(false);
  const createDraft = useDraftState(
    "usuarios:new",
    {
      apellidoNombre: "",
      nombreUsuario: "",
      legajo: "",
      perfilRol: "Empleado" as Role,
      idArea: "",
      habilitado: true,
    },
    { storage: "local" }
  );
  const [password, setPassword] = useState(""); // en memoria (no localStorage)
  const [creating, setCreating] = useState(false);

  const hasCreateDraft =
    createDraft.value.apellidoNombre.trim().length > 0 ||
    createDraft.value.nombreUsuario.trim().length > 0 ||
    (createDraft.value.legajo ?? "").trim().length > 0 ||
    createDraft.value.idArea.trim().length > 0 ||
    password.length > 0;

  // Admin actions (inline)
  const [savingId, setSavingId] = useState<number | null>(null);
  // Modal: editar usuario (Admin)
  const [openEditUser, setOpenEditUser] = useState(false);
  const [minimizedEditUser, setMinimizedEditUser] = useState(false);
  const editUserDraft = useDraftState(
    "usuarios:edit",
    {
      id: 0,
      apellidoNombre: "",
      nombreUsuario: "",
      legajo: "",
      perfilRol: "Empleado" as Role,
      idArea: "",
      habilitado: true,
    },
    { storage: "local" }
  );
  const [savingUser, setSavingUser] = useState(false);
  const hasEditUserDraft =
    Boolean(editUserDraft.value.id) &&
    (editUserDraft.value.apellidoNombre.trim().length > 0 ||
      editUserDraft.value.nombreUsuario.trim().length > 0 ||
      (editUserDraft.value.legajo ?? "").trim().length > 0 ||
      editUserDraft.value.idArea.trim().length > 0);
  // Modal: reset password (Admin) - en memoria
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [openReset, setOpenReset] = useState(false);
  const [minimizedReset, setMinimizedReset] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetting, setResetting] = useState(false);

  async function load() {
    if (!canSee) return;
    setLoading(true);
    setError(null);
    try {
      const [a, u] = await Promise.all([
        apiFetch<ListResponse<Area>>("/areas", { token }),
        apiFetch<ListResponse<UsuarioListItem>>("/usuarios", { token }),
      ]);
      setAreas(a.items);
      setItems(u.items);
      setPage(1);
      if (!createDraft.value.idArea && a.items.length) {
        createDraft.setValue((d) => ({ ...d, idArea: String(a.items[0].id_area) }));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudieron cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  function startEditUser(u: UsuarioListItem) {
    editUserDraft.setValue({
      id: u.id_usuario,
      apellidoNombre: u.apellido_nombre,
      nombreUsuario: u.nombre_usuario,
      legajo: u.legajo ?? "",
      perfilRol: u.perfil_rol,
      idArea: String(u.id_area),
      habilitado: toBool(u.habilitado),
    });
    setOpenEditUser(true);
    setMinimizedEditUser(false);
  }

  async function saveEditUser() {
    setSavingUser(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/usuarios/${editUserDraft.value.id}`, {
        method: "PATCH",
        token,
        body: {
          apellido_nombre: editUserDraft.value.apellidoNombre.trim(),
          nombre_usuario: editUserDraft.value.nombreUsuario.trim(),
          legajo: (editUserDraft.value.legajo ?? "").trim() || null,
          perfil_rol: editUserDraft.value.perfilRol,
          id_area: Number(editUserDraft.value.idArea),
          habilitado: Boolean(editUserDraft.value.habilitado),
        },
      });
      editUserDraft.clear();
      setOpenEditUser(false);
      setMinimizedEditUser(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar el usuario");
    } finally {
      setSavingUser(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canSee]);

  const roleOptions = useMemo(() => {
    const base: Role[] = ["Empleado", "Soporte"];
    if (isAdmin) base.push("Admin");
    return base;
  }, [isAdmin]);

  function toggleSort(next: typeof sortKey) {
    if (sortKey !== next) {
      setSortKey(next);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  const sortedItems = useMemo(() => {
    return applyClientSort(items, sortDir, (u) => {
      switch (sortKey) {
        case "id":
          return u.id_usuario;
        case "legajo":
          return u.legajo ?? "";
        case "nombre":
          return u.apellido_nombre;
        case "usuario":
          return u.nombre_usuario;
        case "area":
          return u.area_nombre ?? u.id_area;
        case "rol":
          return u.perfil_rol;
        case "habilitado":
          return toBool(u.habilitado) ? 1 : 0;
      }
    });
  }, [items, sortDir, sortKey]);

  const total = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = sortedItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (!canSee) {
    return (
      <div>
        <AppHeader title="Usuarios" />
        <div className="p-6 text-sm text-muted-foreground">
          No tenés permisos para ver esta pantalla.
        </div>
      </div>
    );
  }

  async function createUser() {
    setCreating(true);
    setError(null);
    try {
      await apiFetch<{ id_usuario: number }>("/usuarios", {
        method: "POST",
        token,
        body: {
          apellido_nombre: createDraft.value.apellidoNombre.trim(),
          nombre_usuario: createDraft.value.nombreUsuario.trim(),
          legajo: createDraft.value.legajo.trim() || null,
          perfil_rol: createDraft.value.perfilRol,
          habilitado: createDraft.value.habilitado,
          id_area: Number(createDraft.value.idArea),
          password,
        },
      });
      createDraft.clear();
      setPassword("");
      setOpenCreate(false);
      setMinimizedCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el usuario");
    } finally {
      setCreating(false);
    }
  }

  async function adminUpdateUser(
    id_usuario: number,
    patch: Partial<Pick<UsuarioListItem, "perfil_rol" | "habilitado" | "id_area">>
  ) {
    setSavingId(id_usuario);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/usuarios/${id_usuario}`, {
        method: "PATCH",
        token,
        body: patch,
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo actualizar el usuario");
    } finally {
      setSavingId(null);
    }
  }

  async function adminResetPassword(id_usuario: number) {
    setResetting(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/usuarios/${id_usuario}/password`, {
        method: "PATCH",
        token,
        body: { password: resetPasswordValue },
      });
      setResetPasswordValue("");
      setOpenReset(false);
      setMinimizedReset(false);
      setResetUserId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo resetear la contraseña");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <AppHeader title="Usuarios" />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Administración de usuarios.</p>
          <Button
            onClick={() => {
              setOpenCreate(true);
              setMinimizedCreate(false);
            }}
          >
            Nuevo usuario
          </Button>
        </div>

        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) setMinimizedCreate(hasCreateDraft);
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Nuevo usuario</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Apellido y nombre</Label>
                <Input
                  value={createDraft.value.apellidoNombre}
                  onChange={(e) =>
                    createDraft.setValue((d) => ({ ...d, apellidoNombre: e.target.value }))
                  }
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre de usuario</Label>
                <Input
                  value={createDraft.value.nombreUsuario}
                  onChange={(e) =>
                    createDraft.setValue((d) => ({ ...d, nombreUsuario: e.target.value }))
                  }
                  disabled={creating}
                />
              </div>
            <div className="space-y-2">
              <Label>Legajo</Label>
              <Input
                value={createDraft.value.legajo}
                onChange={(e) => createDraft.setValue((d) => ({ ...d, legajo: e.target.value }))}
                disabled={creating}
              />
            </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={createDraft.value.perfilRol}
                  onValueChange={(v) => createDraft.setValue((d) => ({ ...d, perfilRol: v as Role }))}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isAdmin && createDraft.value.perfilRol === "Admin" ? (
                  <p className="text-xs text-muted-foreground">Soporte no puede crear Admin.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Área</Label>
                <Select
                  value={createDraft.value.idArea}
                  onValueChange={(v) => createDraft.setValue((d) => ({ ...d, idArea: v }))}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Área..." />
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
              <div className="space-y-2">
                <Label>Contraseña inicial</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={creating}
                />
                <p className="text-xs text-muted-foreground">
                  La contraseña no se guarda como borrador en el navegador.
                </p>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={createDraft.value.habilitado}
                    onCheckedChange={(v) => createDraft.setValue((d) => ({ ...d, habilitado: v }))}
                    disabled={creating}
                  />
                  <span className="text-sm">Habilitado</span>
                </div>
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
                  setPassword("");
                  setMinimizedCreate(false);
                  setOpenCreate(false);
                }}
                disabled={creating}
              >
                Descartar
              </Button>
              <Button
                onClick={createUser}
                disabled={
                  creating ||
                  createDraft.value.apellidoNombre.trim().length === 0 ||
                  createDraft.value.nombreUsuario.trim().length === 0 ||
                  password.length === 0 ||
                  !createDraft.value.idArea ||
                  (!isAdmin && createDraft.value.perfilRol === "Admin")
                }
              >
                {creating ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openReset}
          onOpenChange={(v) => {
            setOpenReset(v);
            if (!v) setMinimizedReset(resetPasswordValue.length > 0);
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                disabled={resetting}
              />
              <p className="text-xs text-muted-foreground">
                Esta contraseña no se persiste como borrador.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpenReset(false);
                  setMinimizedReset(resetPasswordValue.length > 0);
                }}
                disabled={resetting}
              >
                Minimizar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResetPasswordValue("");
                  setResetUserId(null);
                  setMinimizedReset(false);
                  setOpenReset(false);
                }}
                disabled={resetting}
              >
                Descartar
              </Button>
              <Button
                onClick={() => resetUserId && adminResetPassword(resetUserId)}
                disabled={resetting || !resetUserId || resetPasswordValue.length === 0}
              >
                {resetting ? "Reseteando..." : "Resetear"}
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
                    label="Legajo"
                    active={sortKey === "legajo"}
                    dir={sortDir}
                    onToggle={() => toggleSort("legajo")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Nombre"
                    active={sortKey === "nombre"}
                    dir={sortDir}
                    onToggle={() => toggleSort("nombre")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Usuario"
                    active={sortKey === "usuario"}
                    dir={sortDir}
                    onToggle={() => toggleSort("usuario")}
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
                    label="Rol"
                    active={sortKey === "rol"}
                    dir={sortDir}
                    onToggle={() => toggleSort("rol")}
                  />
                </TableHead>
                <TableHead>
                  <SortableHead
                    label="Habilitado"
                    active={sortKey === "habilitado"}
                    dir={sortDir}
                    onToggle={() => toggleSort("habilitado")}
                  />
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                    No hay usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                pagedItems.map((u) => {
                  const busy = savingId === u.id_usuario || (resetting && resetUserId === u.id_usuario);
                  return (
                    <TableRow key={u.id_usuario}>
                      <TableCell className="font-medium">{u.id_usuario}</TableCell>
                      <TableCell>{u.legajo ?? "—"}</TableCell>
                      <TableCell>{u.apellido_nombre}</TableCell>
                      <TableCell>{u.nombre_usuario}</TableCell>
                      <TableCell>{u.area_nombre ?? u.id_area}</TableCell>
                      <TableCell>{u.perfil_rol}</TableCell>
                      <TableCell>{toBool(u.habilitado) ? "Sí" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/usuarios/${u.id_usuario}`}>Ver más</Link>
                          </Button>
                          {isAdmin ? (
                            <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditUser(u)}
                              disabled={busy}
                            >
                              Editar
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                adminUpdateUser(u.id_usuario, { habilitado: !toBool(u.habilitado) })
                              }
                              disabled={busy}
                            >
                              {toBool(u.habilitado) ? "Deshabilitar" : "Habilitar"}
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => {
                                setResetUserId(u.id_usuario);
                                setOpenReset(true);
                                setMinimizedReset(false);
                              }}
                              disabled={busy}
                            >
                              Reset password
                            </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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
        title="Nuevo usuario"
        description="Borrador guardado"
        visible={minimizedCreate && hasCreateDraft}
        onRestore={() => {
          setOpenCreate(true);
          setMinimizedCreate(false);
        }}
        onDiscard={() => {
          createDraft.clear();
          setPassword("");
          setMinimizedCreate(false);
        }}
      />

      <DraftDock
        title="Reset password"
        description={resetUserId ? `Usuario #${resetUserId}` : undefined}
        visible={minimizedReset && resetPasswordValue.length > 0}
        onRestore={() => {
          setOpenReset(true);
          setMinimizedReset(false);
        }}
        onDiscard={() => {
          setResetPasswordValue("");
          setResetUserId(null);
          setMinimizedReset(false);
        }}
        className="bottom-24"
      />

      <Dialog
        open={openEditUser}
        onOpenChange={(v) => {
          setOpenEditUser(v);
          if (!v) setMinimizedEditUser(hasEditUserDraft);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Apellido y nombre</Label>
              <Input
                value={editUserDraft.value.apellidoNombre}
                onChange={(e) => editUserDraft.setValue((d) => ({ ...d, apellidoNombre: e.target.value }))}
                disabled={savingUser}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre de usuario</Label>
              <Input
                value={editUserDraft.value.nombreUsuario}
                onChange={(e) => editUserDraft.setValue((d) => ({ ...d, nombreUsuario: e.target.value }))}
                disabled={savingUser}
              />
            </div>
            <div className="space-y-2">
              <Label>Legajo</Label>
              <Input
                value={editUserDraft.value.legajo}
                onChange={(e) => editUserDraft.setValue((d) => ({ ...d, legajo: e.target.value }))}
                disabled={savingUser}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={editUserDraft.value.perfilRol}
                onValueChange={(v) => editUserDraft.setValue((d) => ({ ...d, perfilRol: v as Role }))}
                disabled={savingUser}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Empleado", "Soporte", "Admin"] as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select
                value={editUserDraft.value.idArea}
                onValueChange={(v) => editUserDraft.setValue((d) => ({ ...d, idArea: v }))}
                disabled={savingUser}
              >
                <SelectTrigger>
                  <SelectValue />
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
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editUserDraft.value.habilitado}
                  onCheckedChange={(v) => editUserDraft.setValue((d) => ({ ...d, habilitado: v }))}
                  disabled={savingUser}
                />
                <span className="text-sm">Habilitado</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpenEditUser(false);
                setMinimizedEditUser(hasEditUserDraft);
              }}
              disabled={savingUser}
            >
              Minimizar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                editUserDraft.clear();
                setMinimizedEditUser(false);
                setOpenEditUser(false);
              }}
              disabled={savingUser}
            >
              Descartar
            </Button>
            <Button
              onClick={saveEditUser}
              disabled={
                savingUser ||
                editUserDraft.value.apellidoNombre.trim().length === 0 ||
                editUserDraft.value.nombreUsuario.trim().length === 0 ||
                editUserDraft.value.idArea.trim().length === 0
              }
            >
              {savingUser ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftDock
        title="Editar usuario"
        description={editUserDraft.value.id ? `ID ${editUserDraft.value.id}` : undefined}
        visible={minimizedEditUser && hasEditUserDraft}
        onRestore={() => {
          setOpenEditUser(true);
          setMinimizedEditUser(false);
        }}
        onDiscard={() => {
          editUserDraft.clear();
          setMinimizedEditUser(false);
        }}
        className="bottom-24"
      />
    </div>
  );
}

