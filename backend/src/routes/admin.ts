import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { UsageEventModel } from "../models/UsageEvent";

const router = Router();

// All admin routes require an ADMIN_USERS membership on top of a valid JWT.
router.use(requireAdmin);

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/admin/usage?days=30
// Returns aggregated usage counts by day / user / event type — counts only,
// never raw events and never any content. Powers daily-active-users and
// requests-per-user views.
router.get("/usage", async (req: Request, res: Response) => {
  const parsed = Number.parseInt(String(req.query.days ?? ""), 10);
  const days = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), MAX_DAYS) : DEFAULT_DAYS;
  const since = new Date(Date.now() - days * DAY_MS);

  try {
    const rows = await UsageEventModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            userId: "$userId",
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          day: "$_id.day",
          userId: "$_id.userId",
          type: "$_id.type",
          count: 1,
        },
      },
      { $sort: { day: 1, userId: 1, type: 1 } },
    ]);
    res.json({ days, rows });
  } catch (err) {
    console.error("[admin] usage aggregation failed:", err);
    res.status(500).json({ error: "usage aggregation failed" });
  }
});

export default router;
