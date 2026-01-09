import { cn } from "@/lib/utils";
import type { Solicitud } from "@/lib/types";

export function estadoBadgeClass(estado: Solicitud["estado"]) {
  switch (estado) {
    case "Iniciada":
      return cn(
        "bg-sky-50 text-sky-700 border-sky-200",
        "dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-900"
      );
    case "En Proceso":
      return cn(
        "bg-amber-50 text-amber-800 border-amber-200",
        "dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900"
      );
    case "Finalizada":
      return cn(
        "bg-emerald-50 text-emerald-800 border-emerald-200",
        "dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900"
      );
  }
}

export function prioridadBadgeClass(prioridad: NonNullable<Solicitud["prioridad"]>) {
  switch (prioridad) {
    case "Urgente":
      return cn(
        "bg-red-50 text-red-800 border-red-200",
        "dark:bg-red-950/30 dark:text-red-200 dark:border-red-900"
      );
    case "Alto":
      return cn(
        "bg-orange-50 text-orange-800 border-orange-200",
        "dark:bg-orange-950/30 dark:text-orange-200 dark:border-orange-900"
      );
    case "Medio":
      return cn(
        "bg-amber-50 text-amber-800 border-amber-200",
        "dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900"
      );
    case "Bajo":
      return cn(
        "bg-sky-50 text-sky-700 border-sky-200",
        "dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-900"
      );
    case "Muy bajo":
      return cn(
        "bg-slate-50 text-slate-700 border-slate-200",
        "dark:bg-slate-950/30 dark:text-slate-200 dark:border-slate-900"
      );
  }
}

