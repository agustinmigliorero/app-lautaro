import type { Role } from "@/lib/types";

const ROLE_ORDER: Record<Role, number> = {
  Empleado: 1,
  Soporte: 2,
  Admin: 3,
};

export function hasMinRole(userRole: Role | null | undefined, minRole: Role): boolean {
  const r = userRole ?? "Empleado";
  return ROLE_ORDER[r] >= ROLE_ORDER[minRole];
}

