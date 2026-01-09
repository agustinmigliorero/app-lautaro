"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { LoginResponse, MeUser } from "@/lib/types";

const TOKEN_KEY = "access_token";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type SessionContextValue = {
  status: SessionStatus;
  token: string | null;
  user: MeUser | null;
  login: (nombre_usuario: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function writeToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!token) window.localStorage.removeItem(TOKEN_KEY);
  else window.localStorage.setItem(TOKEN_KEY, token);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const refreshMe = useCallback(async () => {
    const t = readToken();
    setToken(t);
    if (!t) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      const data = await apiFetch<{ user: MeUser }>("/auth/me", { token: t });
      setUser(data.user);
      setStatus("authenticated");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        writeToken(null);
        setToken(null);
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      // En errores de red/servidor, mantenemos el token pero marcamos no autenticado para forzar re-login.
      setStatus("unauthenticated");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (nombre_usuario: string, password: string) => {
    const data = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { nombre_usuario, password },
    });
    writeToken(data.access_token);
    setToken(data.access_token);
    // Preferimos /auth/me como fuente de verdad (incluye campos extra como legajo/habilitado)
    try {
      const me = await apiFetch<{ user: MeUser }>("/auth/me", { token: data.access_token });
      setUser(me.user);
      setStatus("authenticated");
    } catch {
      // fallback (no debería pasar)
      setUser({
        id_usuario: data.user.id_usuario,
        apellido_nombre: data.user.apellido_nombre,
        nombre_usuario: data.user.nombre_usuario,
        legajo: data.user.legajo ?? null,
        perfil_rol: data.user.perfil_rol,
        habilitado: true,
        id_area: data.user.id_area,
      });
      setStatus("authenticated");
    }
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, token, user, login, logout, refreshMe }),
    [status, token, user, login, logout, refreshMe]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

