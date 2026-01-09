import { API_BASE_URL } from "@/lib/env";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  token?: string | null;
  body?: unknown;
};

export async function apiFetch<T>(
  path: string,
  { token, body, headers, ...init }: ApiFetchOptions = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: typeof body === "undefined" ? undefined : JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const msg =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as any).error)
        : null) || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, payload);
  }

  return payload as T;
}

