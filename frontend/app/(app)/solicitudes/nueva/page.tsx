"use client";

import { redirect } from "next/navigation";

export default function NuevaSolicitudPage() {
  redirect("/solicitudes?new=1");
}

