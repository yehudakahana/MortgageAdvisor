import { Router } from "express";
import { randomUUID } from "crypto";
import { UserModel } from "../models/User";
import { User } from "../types";
import { ClientModel } from "../models/Client";
import { ADMIN_MESSAGES } from "../constants/messages";
import { isReservedUsername, toPublicUser, USERNAME_PATTERN } from "../services/userView";
import { duplicateKeyMessage, parseProfileFields } from "../services/adminUserInput";
import { issueLink } from "../services/linkTokenService";
import { logAuditEvent } from "../services/auditService";

// /api/admin/users — list, create, edit. Mounted behind requireAdmin().
// Metadata only: no client, document or chat content leaves these routes.
const router = Router();
const actor = (req: { user?: { username: string } }) => req.user?.username ?? "unknown";

// GET /api/admin/users
router.get("/", async (_req, res) => {
  try {
    const users = await UserModel.find().sort({ createdAt: 1 }).lean<User[]>();
    const counts = await ClientModel.aggregate<{ _id: string; clients: number; documents: number }>([
      { $match: { userId: { $in: users.map((u) => u.username) } } },
      { $group: { _id: "$userId", clients: { $sum: 1 }, documents: { $sum: { $size: "$documents" } } } },
    ]);
    const byUser = new Map(counts.map((c) => [c._id, c]));
    res.json(
      users.map((u) => ({
        ...toPublicUser(u),
        clientCount: byUser.get(u.username)?.clients ?? 0,
        documentCount: byUser.get(u.username)?.documents ?? 0,
      }))
    );
  } catch (err) {
    console.error("[admin] list users failed:", err);
    res.status(500).json({ error: ADMIN_MESSAGES.requestFailed });
  }
});

// POST /api/admin/users { username, email, name?, phone?, paidUntil?, notes? }
// Creates an "invited" account with no password and returns a one-time invite
// link (7 days). The user chooses the password through that link.
router.post("/", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!USERNAME_PATTERN.test(username)) return res.status(400).json({ error: ADMIN_MESSAGES.invalidUsername });
  if (isReservedUsername(username)) return res.status(400).json({ error: ADMIN_MESSAGES.reservedUsername });
  if (body.email === undefined) return res.status(400).json({ error: ADMIN_MESSAGES.invalidEmail });

  const fields = parseProfileFields(body);
  if ("error" in fields) return res.status(400).json({ error: fields.error });

  try {
    const user = await UserModel.create({
      id: randomUUID(),
      username,
      ...fields,
      role: "member",
      status: "invited",
    });
    const link = await issueLink(user.id, "invite");
    await logAuditEvent({ actor: actor(req), action: "user.created", target: username, ip: req.ip });
    return res.status(201).json({ user: toPublicUser(user.toObject()), link });
  } catch (err) {
    const duplicate = duplicateKeyMessage(err);
    if (duplicate) return res.status(409).json({ error: duplicate });
    console.error("[admin] create user failed:", err);
    return res.status(500).json({ error: ADMIN_MESSAGES.requestFailed });
  }
});

// PATCH /api/admin/users/:id { email?, name?, phone?, paidUntil?, notes? }
// paidUntil is bookkeeping only: nothing blocks a user automatically by date.
router.patch("/:id", async (req, res) => {
  const fields = parseProfileFields((req.body ?? {}) as Record<string, unknown>);
  if ("error" in fields) return res.status(400).json({ error: fields.error });
  if (Object.keys(fields).length === 0) return res.status(400).json({ error: ADMIN_MESSAGES.invalidFields });

  try {
    const user = await UserModel.findOneAndUpdate({ id: req.params.id }, { $set: fields }, { new: true }).lean<User>();
    if (!user) return res.status(404).json({ error: ADMIN_MESSAGES.userNotFound });
    await logAuditEvent({
      actor: actor(req),
      action: "user.updated",
      target: user.username,
      ip: req.ip,
      meta: { fields: Object.keys(fields) },
    });
    return res.json(toPublicUser(user));
  } catch (err) {
    const duplicate = duplicateKeyMessage(err);
    if (duplicate) return res.status(409).json({ error: duplicate });
    console.error("[admin] update user failed:", err);
    return res.status(500).json({ error: ADMIN_MESSAGES.requestFailed });
  }
});

export default router;
