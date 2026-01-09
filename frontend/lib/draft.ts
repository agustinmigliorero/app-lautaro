"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type StorageMode = "local" | "memory";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function useDraftState<T>(
  key: string,
  initial: T,
  {
    storage = "local",
  }: {
    storage?: StorageMode;
  } = {}
) {
  const storageKey = useMemo(() => `draft:${key}`, [key]);
  const [value, setValue] = useState<T>(() => initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (storage !== "local") {
      setHydrated(true);
      return;
    }
    const loaded = safeParse<T>(window.localStorage.getItem(storageKey));
    if (loaded) {
      // Compatibilidad hacia atrás: si el draft guardado no tiene campos nuevos,
      // mergeamos con el initial para evitar undefineds (ej: legajo agregado después).
      if (isPlainObject(initial) && isPlainObject(loaded)) {
        setValue({ ...(initial as any), ...(loaded as any) });
      } else {
        setValue(loaded);
      }
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, storage]);

  useEffect(() => {
    if (!hydrated) return;
    if (storage !== "local") return;
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  }, [value, storageKey, hydrated, storage]);

  const clear = useCallback(() => {
    setValue(initial);
    if (storage === "local") window.localStorage.removeItem(storageKey);
  }, [initial, storage, storageKey]);

  return { value, setValue, clear, hydrated };
}

