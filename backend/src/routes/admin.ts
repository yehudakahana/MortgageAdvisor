import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuditLogModel } from "../models/AuditLog";
import { ADMIN_MESSAGES } from "../constants/messages";
import { requireAdmin } from "../middleware/requireAdmin";
import adminMfaRouter from "./adminMfa";
import adminUsersRouter from "./adminUsers";
import adminUserActionsRouter from "./adminUserActions";

// /api/admin — mounted after authenticateToken. Every route requires a
// superadmin loaded from MongoDB on this request; all but /status and the 2FA
// enrollment routes also require a session that passed 2FA.
const router = Router();

router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: ADMIN_MESSAGES.tooManyRequests },
  })
);

router.use(requireAdmin({ requireMfa: false }), adminMfaRouter);

router.use(requireAdmin());
router.use("/users", adminUsersRouter);
router.use("/users", adminUserActionsRouter);

const AUDIT_PAGE_SIZE = 50;

// GET /api/admin/audit?page=1 — newest first.
router.get("/audit", async (req, res) => {
  const page = Math.max(1, Math.min(1000, Number.parseInt(String(req.query.page ?? "1"), 10) || 1));
  try {
    const rows = await AuditLogModel.find({}, { _id: 0 })
      .sort({ createdAt: -1 })
      .skip((page - 1) * AUDIT_PAGE_SIZE)
      .limit(AUDIT_PAGE_SIZE + 1)
      .lean();
    res.json({ items: rows.slice(0, AUDIT_PAGE_SIZE), page, hasMore: rows.length > AUDIT_PAGE_SIZE });
  } catch (err) {
    console.error("[admin] audit list failed:", err);
    res.status(500).json({ error: ADMIN_MESSAGES.requestFailed });
  }
});

export default router;
