"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DraftDock } from "@/components/DraftDock";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/TablePagination";
import { apiFetch, ApiError } from "@/lib/api";
import { useDraftState } from "@/lib/draft";
import { useSession } from "@/lib/session";
import type { Evento, ListResponse, MeUser, Solicitud } from "@/lib/types";

type Diagnostico = { id_diagnostico: number; descripcion: string };

export default function SolicitudDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { token, user } = useSession();

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [observaciones, setObservaciones] = useState("");
  const [posting, setPosting] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageSize, setEventsPageSize] = useState(10);

  const isSoporte = user?.perfil_rol === "Soporte" || user?.perfil_rol === "Admin";
  const [usuariosSoporte, setUsuariosSoporte] = useState<MeUser[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);

  const [asignando, setAsignando] = useState(false);
  const [usuarioAsignado, setUsuarioAsignado] = useState<string>("");

  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [estado, setEstado] = useState<string>("");
  const [idDiagnostico, setIdDiagnostico] = useState<string>("");
  const [resolucionMetodo, setResolucionMetodo] = useState<string>("");

  // Crear diagnóstico desde el ticket (modal + borrador)
  const [openNewDiag, setOpenNewDiag] = useState(false);
  const [minimizedNewDiag, setMinimizedNewDiag] = useState(false);
  const diagDraft = useDraftState(`solicitud:${id}:newDiagnostico`, { descripcion: "" }, { storage: "local" });
  const [creatingDiag, setCreatingDiag] = useState(false);
  const hasDiagDraft = diagDraft.value.descripcion.trim().length > 0;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ solicitud: Solicitud; eventos: Evento[] }>(`/solicitudes/${id}`, { token });
      setSolicitud(data.solicitud);
      setEventos(data.eventos);
      setEventsPage(1);
      setEstado(data.solicitud.estado);
      setUsuarioAsignado(data.solicitud.usuario_asignado ? String(data.solicitud.usuario_asignado) : "");
      setIdDiagnostico(data.solicitud.id_diagnostico ? String(data.solicitud.id_diagnostico) : "");
      setResolucionMetodo(data.solicitud.resolucion_metodo ? String(data.solicitud.resolucion_metodo) : "");

      if (isSoporte) {
        const [u, d] = await Promise.all([
          apiFetch<ListResponse<MeUser>>("/usuarios", { token }),
          apiFetch<ListResponse<Diagnostico>>("/diagnosticos", { token }),
        ]);
        setUsuariosSoporte(u.items.filter((x) => x.perfil_rol === "Soporte" || x.perfil_rol === "Admin"));
        setDiagnosticos(d.items);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cargar la solicitud");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const estadoBadgeVariant = useMemo(() => {
    if (!solicitud) return "secondary" as const;
    return solicitud.estado === "Finalizada" ? ("secondary" as const) : ("default" as const);
  }, [solicitud]);

  async function postEvento() {
    setPosting(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/solicitudes/${id}/eventos`, {
        method: "POST",
        token,
        body: { observaciones },
      });
      setObservaciones("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo agregar la observación");
    } finally {
      setPosting(false);
    }
  }

  async function asignar() {
    setAsignando(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/solicitudes/${id}/asignar`, {
        method: "PATCH",
        token,
        body: { usuario_asignado: Number(usuarioAsignado) },
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo asignar");
    } finally {
      setAsignando(false);
    }
  }

  async function cambiarEstado() {
    setCambiandoEstado(true);
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/solicitudes/${id}/estado`, {
        method: "PATCH",
        token,
        body: {
          estado,
          ...(estado === "Finalizada"
            ? { id_diagnostico: Number(idDiagnostico), resolucion_metodo: resolucionMetodo }
            : {}),
        },
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cambiar el estado");
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function createDiagnosticoInline() {
    setCreatingDiag(true);
    setError(null);
    try {
      const created = await apiFetch<{ id_diagnostico: number }>("/diagnosticos", {
        method: "POST",
        token,
        body: { descripcion: diagDraft.value.descripcion.trim() },
      });
      setIdDiagnostico(String(created.id_diagnostico));
      diagDraft.clear();
      setOpenNewDiag(false);
      setMinimizedNewDiag(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el diagnóstico");
    } finally {
      setCreatingDiag(false);
    }
  }

  return (
    <div>
      <AppHeader title={`Solicitud #${id}`} />
      <div className="p-6 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Detalle
              {solicitud ? <Badge variant={estadoBadgeVariant}>{solicitud.estado}</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : !solicitud ? (
              <p className="text-muted-foreground">No encontrada.</p>
            ) : (
              <>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>{" "}
                  {new Date(solicitud.fecha).toLocaleString()}
                </div>
                <div>
                  <span className="text-muted-foreground">Equipo:</span> {solicitud.id_equipo}
                </div>
                <div>
                  <span className="text-muted-foreground">Solicitante:</span> {solicitud.usuario_solicitud}
                </div>
                <div>
                  <span className="text-muted-foreground">Generador:</span> {solicitud.usuario_generador}
                </div>
                <div>
                  <span className="text-muted-foreground">Asignado:</span>{" "}
                  {solicitud.usuario_asignado ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Resolución:</span>{" "}
                  {solicitud.resolucion_metodo ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Diagnóstico:</span>{" "}
                  {solicitud.id_diagnostico
                    ? `${solicitud.id_diagnostico}${solicitud.diagnostico_descripcion ? ` · ${solicitud.diagnostico_descripcion}` : ""}`
                    : "—"}
                </div>
                <div className="pt-2">
                  <span className="text-muted-foreground">Descripción:</span>
                  <p className="whitespace-pre-wrap mt-1">{solicitud.descripcion_falla}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {isSoporte ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asignación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={usuarioAsignado} onValueChange={setUsuarioAsignado} disabled={asignando || loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar técnico..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosSoporte.map((u) => (
                      <SelectItem key={u.id_usuario} value={String(u.id_usuario)}>
                        {u.apellido_nombre} ({u.perfil_rol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={asignar} disabled={asignando || !usuarioAsignado || loading}>
                  {asignando ? "Asignando..." : "Asignar / Reasignar"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={estado} onValueChange={setEstado} disabled={cambiandoEstado || loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Iniciada">Iniciada</SelectItem>
                    <SelectItem value="En Proceso">En Proceso</SelectItem>
                    <SelectItem value="Finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>

                {estado === "Finalizada" ? (
                  <div className="space-y-3">
                    <Select
                      value={idDiagnostico}
                      onValueChange={setIdDiagnostico}
                      disabled={cambiandoEstado || loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Diagnóstico..." />
                      </SelectTrigger>
                      <SelectContent>
                        {diagnosticos.map((d) => (
                          <SelectItem key={d.id_diagnostico} value={String(d.id_diagnostico)}>
                            {d.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setOpenNewDiag(true);
                          setMinimizedNewDiag(false);
                        }}
                        disabled={cambiandoEstado || loading}
                      >
                        Nuevo diagnóstico
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Método de resolución</Label>
                      <div className="grid gap-2">
                        {(["Laboratorio", "Telefónica", "Remota", "Desplazamiento"] as const).map((m) => {
                          const checked = resolucionMetodo === m;
                          return (
                            <label key={m} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => setResolucionMetodo(v ? m : "")}
                                disabled={cambiandoEstado || loading}
                              />
                              {m === "Desplazamiento" ? "Requirió Desplazamiento" : m}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                <Button
                  onClick={cambiarEstado}
                  disabled={
                    cambiandoEstado ||
                    loading ||
                    (estado === "Finalizada" && (!idDiagnostico || !resolucionMetodo))
                  }
                >
                  {cambiandoEstado ? "Guardando..." : "Guardar estado"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : eventos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        Sin eventos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    eventos
                      .slice(
                        (eventsPage - 1) * eventsPageSize,
                        eventsPage * eventsPageSize
                      )
                      .map((ev) => (
                      <TableRow key={ev.id_evento}>
                        <TableCell>{new Date(ev.fecha_evento).toLocaleString()}</TableCell>
                        <TableCell>{ev.id_usuario}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{ev.observaciones ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              page={eventsPage}
              pageSize={eventsPageSize}
              total={eventos.length}
              pageSizeOptions={[10, 20]}
              onPageChange={setEventsPage}
              onPageSizeChange={(n) => {
                setEventsPageSize(n);
                setEventsPage(1);
              }}
            />

            <div className="space-y-2">
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregar observación..."
                disabled={posting || loading}
              />
              <Button onClick={postEvento} disabled={posting || loading || observaciones.trim().length === 0}>
                {posting ? "Enviando..." : "Agregar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={openNewDiag}
        onOpenChange={(v) => {
          setOpenNewDiag(v);
          if (!v) setMinimizedNewDiag(hasDiagDraft);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo diagnóstico</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              value={diagDraft.value.descripcion}
              onChange={(e) => diagDraft.setValue({ descripcion: e.target.value })}
              disabled={creatingDiag}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpenNewDiag(false);
                setMinimizedNewDiag(hasDiagDraft);
              }}
              disabled={creatingDiag}
            >
              Minimizar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                diagDraft.clear();
                setMinimizedNewDiag(false);
                setOpenNewDiag(false);
              }}
              disabled={creatingDiag}
            >
              Descartar
            </Button>
            <Button
              onClick={createDiagnosticoInline}
              disabled={creatingDiag || diagDraft.value.descripcion.trim().length === 0}
            >
              {creatingDiag ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftDock
        title="Nuevo diagnóstico"
        description={`Solicitud #${id}`}
        visible={minimizedNewDiag && hasDiagDraft}
        onRestore={() => {
          setOpenNewDiag(true);
          setMinimizedNewDiag(false);
        }}
        onDiscard={() => {
          diagDraft.clear();
          setMinimizedNewDiag(false);
        }}
        className="bottom-24"
      />
    </div>
  );
}

