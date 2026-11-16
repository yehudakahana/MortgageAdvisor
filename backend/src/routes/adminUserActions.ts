import { Router, Request, Response } from "express";
import { UserModel } from "../models/User";
import { AuthTokenModel } from "../models/AuthToken";
import { ADMIN_MESSAGES } from "../constants/messages";
import { toPublicUser } from "../services/userView";
import { issueLink } from "../services/linkTokenService";
import { purgeTenantData } from "../services/tenantDataService";
import { logAuditEvent } from "../services/auditService";
import { User } from "../types";

// /api/admin/users/:id/* — account actions. Mounted behind requireAdmin().
// Every action bumps or checks state in MongoDB and writes an audit record.
const router = Router();

type Guard = { self?: boolean; superadmin?: boolean };

// Loads the target and applies the self / superadmin protections. Responds
// and returns null when the action is not allowed.
async function loadTarget(req: Request, res: Response, guard: Guard): Promise<User | null> {
  const user = await UserModel.findOne({ id: req.params.id }).lean<User>();
  if (!user) {
    res.status(404).json({ error: ADMIN_MESSAGES.userNotFound });
    return null;
  }
  if (guard.self && user.username === req.user?.username) {
    res.status(403).json({ error: ADMIN_MESSAGES.cannotTargetSelf });
    return null;
  }
  if (guard.superadmin && user.role === "superadmin") {
    res.status(403).json({ error: ADMIN_MESSAGES.cannotTargetSuperadmin });
    return null;
  }
  return user;
}

function audit(req: Request, action: string, target: string) {
  return logAuditEvent({ actor: req.user?.username ?? "unknown", action, target, ip: req.ip });
}

// Wraps a handler with the shared 500 response.
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response) =>
  fn(req, res).catch((err) => {
    console.error("[admin] user action failed:", err);
    if (!res.headersSent) res.status(500).json({ error: ADMIN_MESSAGES.requestFailed });
  });

// POST /:id/disable — blocks login and kills every open session now.
router.post("/:id/disable", handle(async (req, res) => {
  const user = await loadTarget(req, res, { self: true, superadmin: true });
  if (!user) return;
  const updated = await UserModel.findOneAndUpdate(
    { id: user.id },
    { $set: { status: "disabled" }, $inc: { tokenVersion: 1 } },
    { new: true }
  ).lean<User>();
  await audit(req, "user.disabled", user.username);
  res.json(toPublicUser(updated as User));
}));

// POST /:id/enable — back to "active", or "invited" if no password was set yet.
router.post("/:id/enable", handle(async (req, res) => {
  const user = await loadTarget(req, res, {});
  if (!user) return;
  const status = user.passwordHash ? "active" : "invited";
  const updated = await UserModel.findOneAndUpdate({ id: user.id }, { $set: { status } }, { new: true }).lean<User>();
  await audit(req, "user.enabled", user.username);
  res.json(toPublicUser(updated as User));
}));

// POST /:id/logout — ends every open session of the user.
router.post("/:id/logout", handle(async (req, res) => {
  const user = await loadTarget(req, res, {});
  if (!user) return;
  await UserModel.updateOne({ id: user.id }, { $inc: { tokenVersion: 1 } });
  await audit(req, "user.forced_logout", user.username);
  res.json({ ok: true });
}));

// POST /:id/link — one-time link, shown once: an invite (7 days) while the
// user has no password, otherwise a password reset (24 hours). Any earlier
// unused link of the user is invalidated.
router.post("/:id/link", handle(async (req, res) => {
  const user = await loadTarget(req, res, {});
  if (!user) return;
  if (user.status === "disabled") {
    res.status(409).json({ error: ADMIN_MESSAGES.userDisabled });
    return;
  }
  const type = user.passwordHash ? "reset" : "invite";
  const link = await issueLink(user.id, type);
  await audit(req, type === "invite" ? "user.invite_link_issued" : "user.reset_link_issued", user.username);
  res.json({ type, link });
}));

// DELETE /:id { confirm: <username> } — deletes the user's clients, own R2
// files, settings and the account. If an R2 delete fails the account is kept
// (500) so the admin can retry without orphaning files.
router.delete("/:id", handle(async (req, res) => {
  const user = await loadTarget(req, res, { self: true, superadmin: true });
  if (!user) return;
  if (req.body?.confirm !== user.username) {
    res.status(400).json({ error: ADMIN_MESSAGES.confirmMismatch });
    return;
  }
  await purgeTenantData(user.username);
  await AuthTokenModel.deleteMany({ userId: user.id });
  await UserModel.deleteOne({ id: user.id });
  await audit(req, "user.deleted", user.username);
  res.json({ ok: true });
}));

export default router;
