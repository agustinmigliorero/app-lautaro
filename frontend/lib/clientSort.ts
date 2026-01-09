import type { SortDir } from "@/components/SortableHead";

export function sortCompare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  // fechas ISO / strings numéricas
  const na = typeof a === "string" ? Number(a) : NaN;
  const nb = typeof b === "string" ? Number(b) : NaN;
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

export function applyClientSort<T>(
  items: T[],
  dir: SortDir,
  accessor: (row: T) => unknown
): T[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...items].sort((x, y) => mult * sortCompare(accessor(x), accessor(y)));
}

