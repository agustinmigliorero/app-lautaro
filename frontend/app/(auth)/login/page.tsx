"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useSession();

  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(nombreUsuario.trim(), password);
      router.replace("/solicitudes");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Ingresar</CardTitle>
          <CardDescription>Acceso al sistema (red local)</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nombre_usuario">Usuario</Label>
              <Input
                id="nombre_usuario"
                autoComplete="username"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                disabled={submitting || status === "loading"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || status === "loading"}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={submitting || status === "loading"}>
              {submitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

