// Thin API client. Demo mode: each page signs in as the synthetic demo user for its role.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "demo123";

export type Role = "customer" | "analyst" | "admin";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const memoryTokens: Partial<Record<Role, string>> = {};

function readToken(role: Role): string | undefined {
  if (memoryTokens[role]) return memoryTokens[role];
  try {
    return window.localStorage.getItem(`shurokkha.token.${role}`) ?? undefined;
  } catch {
    return undefined;
  }
}

function storeToken(role: Role, token: string | undefined) {
  memoryTokens[role] = token;
  try {
    if (token) window.localStorage.setItem(`shurokkha.token.${role}`, token);
    else window.localStorage.removeItem(`shurokkha.token.${role}`);
  } catch {
    /* storage unavailable: memory only */
  }
}

async function login(role: Role): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: role, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new ApiError(res.status, "Demo login failed");
  const token = (await res.json()).access_token as string;
  storeToken(role, token);
  return token;
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    return JSON.stringify(d);
  }
  return fallback;
}

export async function api<T>(path: string, opts: { role: Role; method?: string; body?: unknown; form?: FormData } = { role: "analyst" }): Promise<T> {
  const doFetch = async (token: string) =>
    fetch(`${API_URL}/api/v1${path}`, {
      method: opts.method || (opts.body || opts.form ? "POST" : "GET"),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
    });
  let token = readToken(opts.role) || (await login(opts.role));
  let res = await doFetch(token);
  if (res.status === 401) {
    token = await login(opts.role);
    res = await doFetch(token);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, `${res.status} ${res.statusText}`));
  return data as T;
}

export async function health(): Promise<{ status: string; degraded: string[]; checks: Record<string, unknown> }> {
  const res = await fetch(`${API_URL}/health/ready`);
  return res.json();
}

export const fmtBDT = (n: number | null | undefined) =>
  n == null ? "–" : `৳${Math.round(n).toLocaleString("en-US")}`;
export const fmtPct = (n: number | null | undefined, digits = 1) => (n == null ? "–" : `${(n * 100).toFixed(digits)}%`);
export const fmtTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
