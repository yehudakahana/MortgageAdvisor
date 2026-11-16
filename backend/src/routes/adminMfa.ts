import { Router } from "express";
import { UserModel } from "../models/User";
import { User } from "../types";
import { ADMIN_MESSAGES, AUTH_MESSAGES } from "../constants/messages";
import { getJwtSecret } from "../config/auth";
import { generateTotpSecret, totpUri, verifyTotp } from "../services/totp";
import { generateRecoveryCodes } from "../services/recoveryCodes";
import { signUserToken } from "../services/sessionToken";
import { logAuditEvent } from "../services/auditService";

// 2FA enrollment for the superadmin. Mounted behind requireAdmin({ requireMfa:
// false }) — the admin has no 2FA yet. Once enabled, setup is refused, so a
// stolen password alone cannot re-enroll a new device.
const router = Router();

// GET /api/admin/status — what the admin screen should show.
router.get("/status", async (req, res) => {
  const user = await UserModel.findOne({ username: req.user?.username }).lean<User>();
  res.json({ mfaEnabled: !!user?.totpSecret, mfaSession: req.user?.mfa === true });
});

// POST /api/admin/2fa/setup — starts enrollment, returns the secret to add to
// an authenticator app (manual key or otpauth URI).
router.post("/2fa/setup", async (req, res) => {
  try {
    const user = await UserModel.findOne({ username: req.user?.username });
    if (!user) return res.status(404).json({ error: ADMIN_MESSAGES.userNotFound });
    if (user.totpSecret) return res.status(409).json({ error: ADMIN_MESSAGES.mfaAlreadyEnabled });
    const secret = generateTotpSecret();
    user.totpPendingSecret = secret;
    await user.save();
    return res.json({ secret, uri: totpUri(secret, user.username) });
  } catch (err) {
    console.error("[admin] 2FA setup failed:", err);
    return res.status(500).json({ error: ADMIN_MESSAGES.requestFailed });
  }
});

// POST /api/admin/2fa/enable { code } — confirms the first code, stores the
// secret, returns recovery codes (shown once) and a fresh mfa session token.
// tokenVersion is bumped so every earlier non-2FA session of this admin dies.
router.post("/2fa/enable", async (req, res) => {
  try {
    const user = await UserModel.findOne({ username: req.user?.username });
    if (!user) return res.status(404).json({ error: ADMIN_MESSAGES.userNotFound });
    if (user.totpSecret) return res.status(409).json({ error: ADMIN_MESSAGES.mfaAlreadyEnabled });
    if (!user.totpPendingSecret) return res.status(400).json({ error: ADMIN_MESSAGES.mfaNotStarted });

    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!verifyTotp(user.totpPendingSecret, code)) {
      return res.status(400).json({ error: AUTH_MESSAGES.mfaCodeInvalid });
    }

    const { codes, hashes } = await generateRecoveryCodes();
    user.totpSecret = user.totpPendingSecret;
    user.totpPendingSecret = null;
    user.recoveryCodeHashes = hashes;
    user.tokenVersion += 1;
    await user.save();
    await logAuditEvent({ actor: user.username, action: "auth.mfa_enabled", target: user.username, ip: req.ip });

    const token = signUserToken(user.toObject(), getJwtSecret(), { mfa: true });
    return res.json({ recoveryCodes: codes, token });
  } catch (err) {
    console.error("[admin] 2FA enable failed:", err);
    return res.status(500).json({ error: ADMIN_MESSAGES.requestFailed });
  }
});

export default router;
