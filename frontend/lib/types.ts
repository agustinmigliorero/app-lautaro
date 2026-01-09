export type Role = "Empleado" | "Soporte" | "Admin";

export type MeUser = {
  id_usuario: number;
  apellido_nombre: string;
  nombre_usuario: string;
  legajo?: string | null;
  perfil_rol: Role;
  habilitado: 0 | 1 | boolean;
  id_area: number;
};

export type Area = {
  id_area: number;
  nombre: string;
  descripcion: string | null;
};

export type Dispositivo = {
  id_equipo: number;
  tipo?: "Celular" | "Notebook" | "Conectividad" | "Impresora" | "UPS" | "PC Escritorio" | "Otro";
  descripcion: string | null;
  id_area: number;
  nro_patrimonio: string | null;
  area_nombre?: string;
};

export type DispositivoComponente = {
  id_componente: number;
  id_equipo: number;
  tipo: "Hardware" | "Software" | "Periférico";
  detalle: string;
  created_at?: string;
  updated_at?: string;
};

export type Diagnostico = {
  id_diagnostico: number;
  descripcion: string;
};

export type UsuarioListItem = {
  id_usuario: number;
  apellido_nombre: string;
  nombre_usuario: string;
  legajo?: string | null;
  perfil_rol: Role;
  habilitado: 0 | 1 | boolean;
  id_area: number;
  area_nombre?: string;
};

export type LoginResponse = {
  access_token: string;
  user: {
    id_usuario: number;
    apellido_nombre: string;
    nombre_usuario: string;
    legajo?: string | null;
    perfil_rol: Role;
    id_area: number;
  };
};

export type Solicitud = {
  id_solicitud: number;
  fecha: string;
  descripcion_falla: string;
  prioridad?: "Muy bajo" | "Bajo" | "Medio" | "Alto" | "Urgente";
  usuario_solicitud: number;
  usuario_generador: number;
  usuario_asignado: number | null;
  id_area?: number | null;
  id_equipo: number | null;
  estado: "Iniciada" | "En Proceso" | "Finalizada";
  id_diagnostico: number | null;
  resolucion_metodo: "Laboratorio" | "Telefónica" | "Remota" | "Desplazamiento" | null;
  diagnostico_descripcion?: string | null;
  area_nombre?: string | null;
};

export type Evento = {
  id_evento: number;
  id_solicitud: number;
  fecha_evento: string;
  observaciones: string | null;
  id_usuario: number;
};

export type ListResponse<T> = { items: T[] };

export type PaginatedResponse<T> = {
  items: T[];
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    counts?: Record<string, number>;
  };
};

