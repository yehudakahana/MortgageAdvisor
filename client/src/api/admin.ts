import { authFetch, BASE } from "./index";

// Client for /api/admin (superadmin only). The server re-checks the role and
// the 2FA session on every call; nothing here is a security boundary.

export type UserStatus = "invited" | "active" | "disabled";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string;
  role: "superadmin" | "orgAdmin" | "member";
  status: UserStatus;
  paidUntil: string | null;
  notes: string;
  createdAt: string;
  lastLogin: string | null;
  mfaEnabled: boolean;
  clientCount: number;
  documentCount: number;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  createdAt: string;
}

export type LinkType = "invite" | "reset";

const JSON_HEADERS = { "Content-Type": "application/json" };

// Throws with the server's Hebrew message (empty when unavailable).
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(`${BASE}/admin${path}`, init);
  if (!res.ok) {
    let message = "";
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // non-JSON body - leave message empty
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body ?? {}) });

export const getAdminStatus = () => call<{ mfaEnabled: boolean; mfaSession: boolean }>("/status");
export const startMfaSetup = () => post<{ secret: string; uri: string }>("/2fa/setup");
export const enableMfa = (code: string) =>
  post<{ recoveryCodes: string[]; token: string }>("/2fa/enable", { code });

export const listUsers = () => call<AdminUser[]>("/users");

export interface UserFields {
  email?: string;
  name?: string;
  phone?: string;
  notes?: string;
  paidUntil?: string | null;
}

export const createUser = (data: UserFields & { username: string }) =>
  post<{ user: AdminUser; link: string }>("/users", data);

export const updateUser = (id: string, data: UserFields) =>
  call<AdminUser>(`/users/${id}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(data) });

export const disableUser = (id: string) => post<AdminUser>(`/users/${id}/disable`);
export const enableUser = (id: string) => post<AdminUser>(`/users/${id}/enable`);
export const forceLogout = (id: string) => post<{ ok: true }>(`/users/${id}/logout`);
export const issueUserLink = (id: string) => post<{ type: LinkType; link: string }>(`/users/${id}/link`);

export const deleteUser = (id: string, confirm: string) =>
  call<{ ok: true }>(`/users/${id}`, { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ confirm }) });

export const getAudit = (page: number) =>
  call<{ items: AuditEntry[]; page: number; hasMore: boolean }>(`/audit?page=${page}`);
