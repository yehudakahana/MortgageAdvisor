import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User";
import { User } from "../types";
import { PASSWORD_MESSAGES } from "../constants/messages";
import { isUserSystemEnabled } from "../config/features";
import { consumeLink, findValidLink } from "../services/linkTokenService";
import { isAcceptablePassword } from "../services/userView";
import { logAuditEvent } from "../services/auditService";

// /api/auth/password — public endpoints behind invite / reset links. The token
// only ever travels in a POST body (never a URL), so it does not reach access
// logs or the [ACTIVITY LOG] line. Nothing here logs the token.
const router = Router();

router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: PASSWORD_MESSAGES.tooManyAttempts },
  })
);

router.use((_req, res, next) => (isUserSystemEnabled() ? next() : res.status(404).end()));

// POST /check { token } — is the link still usable, and for whom.
router.post("/check", async (req, res) => {
  try {
    const link = await findValidLink(req.body?.token);
    const user = link ? await UserModel.findOne({ id: link.userId }).lean<User>() : null;
    if (!link || !user || user.status === "disabled") {
      return res.status(400).json({ error: PASSWORD_MESSAGES.linkInvalid });
    }
    return res.json({ type: link.type, username: user.username });
  } catch (err) {
    console.error("[password] link check failed:", err);
    return res.status(500).json({ error: PASSWORD_MESSAGES.setFailed });
  }
});

// POST /set { token, password } — the user chooses her own password. The link
// is consumed atomically (single use). On success: an invited user becomes
// active, and tokenVersion is bumped so any older session is logged out.
router.post("/set", async (req, res) => {
  const { token, password } = req.body ?? {};
  // Validate before consuming, so a weak password doesn't burn the link.
  if (!isAcceptablePassword(password)) {
    return res.status(400).json({ error: PASSWORD_MESSAGES.passwordTooWeak });
  }
  try {
    const pending = await findValidLink(token);
    const owner = pending ? await UserModel.findOne({ id: pending.userId }).lean<User>() : null;
    if (!pending || !owner || owner.status === "disabled") {
      return res.status(400).json({ error: PASSWORD_MESSAGES.linkInvalid });
    }
    const link = await consumeLink(token);
    if (!link) return res.status(400).json({ error: PASSWORD_MESSAGES.linkInvalid });

    const passwordHash = await bcrypt.hash(password, 12);
    const update: Record<string, unknown> = { passwordHash };
    if (owner.status === "invited") update.status = "active";
    // Disabled-in-between guard: never re-activate a user disabled meanwhile.
    const res2 = await UserModel.updateOne(
      { id: owner.id, status: { $ne: "disabled" } },
      { $set: update, $inc: { tokenVersion: 1 } }
    );
    if (res2.matchedCount === 0) return res.status(400).json({ error: PASSWORD_MESSAGES.linkInvalid });

    await logAuditEvent({
      actor: owner.username,
      action: link.type === "invite" ? "password.set_via_invite" : "password.reset",
      target: owner.username,
      ip: req.ip,
    });
    return res.json({ ok: true, username: owner.username });
  } catch (err) {
    console.error("[password] set failed:", err);
    return res.status(500).json({ error: PASSWORD_MESSAGES.setFailed });
  }
});

export default router;
