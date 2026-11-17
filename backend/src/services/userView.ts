import { User } from "../types";

// The only shape a user record may leave the server in. Explicit allow-list:
// a field added to the model later stays private until it is added here.
export function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? "",
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    paidUntil: user.paidUntil,
    notes: user.notes,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    mfaEnabled: !!user.totpSecret,
  };
}

// Usernames that can never be a regular account: the demo-template owner and
// anything in the guest id space.
export function isReservedUsername(username: string): boolean {
  return username === "system" || username.startsWith("guest_");
}

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// bcrypt reads at most 72 bytes; longer passwords would be silently truncated.
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export function isAcceptablePassword(password: unknown): password is string {
  return (
    typeof password === "string" &&
    password.length >= PASSWORD_MIN_LENGTH &&
    Buffer.byteLength(password) <= PASSWORD_MAX_BYTES
  );
}
