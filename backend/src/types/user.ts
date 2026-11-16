// Types for the MongoDB user system (users, one-time links, audit log).

export type UserRole = "superadmin" | "orgAdmin" | "member";
export type UserStatus = "invited" | "active" | "disabled";

export interface User {
  id: string;
  username: string; // immutable tenant key (Client.userId, UserSettings.username)
  email?: string;
  name: string;
  phone: string;
  role: UserRole;
  orgId: string | null;
  status: UserStatus;
  passwordHash: string | null;
  tokenVersion: number;
  paidUntil: Date | null;
  notes: string;
  createdAt: Date;
  lastLogin: Date | null;
  totpSecret: string | null;
  totpPendingSecret: string | null;
  recoveryCodeHashes: string[];
}

export type AuthTokenType = "invite" | "reset";

export interface AuthToken {
  id: string;
  tokenHash: string;
  userId: string;
  type: AuthTokenType;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  ip: string | null;
  meta: Record<string, unknown>;
  createdAt: Date;
}
