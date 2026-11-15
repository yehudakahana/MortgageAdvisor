import { GuestUserModel } from "../models/GuestUser";
import { GUEST_LIMITS } from "../constants/guest";

export type GuestQuotaName = "chat" | "reExtract";

// Outcome of spending one unit: either it was granted (with what is left), or
// the quota is exhausted and `resetInMinutes` says when the next window opens,
// so the rejection message can tell the guest how long to wait.
export type GuestQuotaResult =
  | { allowed: true; remaining: number }
  | { allowed: false; resetInMinutes: number };

// Minutes until `windowStart + quotaWindowMs`. Rounded up and floored at 1 so
// the user-facing message never says "in 0 minutes".
function minutesUntilReset(windowStart: Date, now: number): number {
  const msLeft = windowStart.getTime() + GUEST_LIMITS.quotaWindowMs - now;
  return Math.max(1, Math.ceil(msLeft / 60_000));
}

// Consumes one unit of a guest's rolling hourly quota.
//
// Counters live on the guest record, not in memory, because the guest id is
// stable across sign-outs: re-entering guest mode from the same browser resumes
// the same account and therefore the same counters. An in-memory store would
// also lose them on every redeploy.
//
// Atomic: every branch is a single conditional update, so two truly
// simultaneous requests from one guest cannot both spend the last unit.
export async function consumeGuestQuota(
  guestId: string,
  quota: GuestQuotaName,
  max: number
): Promise<GuestQuotaResult> {
  const now = Date.now();
  const cutoff = new Date(now - GUEST_LIMITS.quotaWindowMs);
  const path = `usage.${quota}`;

  // 1. Live window with room left: increment only if still under the cap.
  const spent = await GuestUserModel.findOneAndUpdate(
    { id: guestId, [`${path}.windowStart`]: { $gt: cutoff }, [`${path}.count`]: { $lt: max } },
    { $inc: { [`${path}.count`]: 1 } },
    { returnDocument: "after" }
  );
  if (spent) return { allowed: true, remaining: max - (spent.usage?.[quota]?.count ?? max) };

  // 2. Window rolled over (or never started): swap in a fresh one with this
  //    request already counted. Only one concurrent request can win the swap.
  const reset = await GuestUserModel.findOneAndUpdate(
    {
      id: guestId,
      $or: [{ [`${path}.windowStart`]: { $lte: cutoff } }, { [`${path}.windowStart`]: null }],
    },
    { $set: { [path]: { count: 1, windowStart: new Date(now) } } },
    { returnDocument: "after" }
  );
  if (reset) return { allowed: true, remaining: max - 1 };

  // 3. Neither matched: the guest is gone, or the cap is reached.
  const guest = await GuestUserModel.findOne({ id: guestId });
  // The auth middleware already proved the guest exists, so a miss here means
  // the record was cleaned up mid-request. Surfacing it as an error (500) is
  // honest; reporting a made-up reset time would not be.
  if (!guest) throw new Error(`guest ${guestId} not found while spending ${quota} quota`);
  const current = guest.usage?.[quota];
  if (current?.windowStart && current.count < max) {
    // A concurrent refund or reset moved the counter between steps: try again.
    return consumeGuestQuota(guestId, quota, max);
  }
  return {
    allowed: false,
    resetInMinutes: minutesUntilReset(current?.windowStart ?? new Date(now), now),
  };
}

// Atomic slot counters for the client and upload caps. Reserve BEFORE the write
// (one conditional $inc, so simultaneous requests cannot overshoot), release when
// the write fails and when the thing is deleted. A crash between reserve and
// release leaves the guest stricter, never looser, and only until its 24h expiry.
export type GuestCounter = "ownClients" | "uploads";

export async function reserveGuestCounter(
  guestId: string,
  counter: GuestCounter,
  max: number
): Promise<"ok" | "full" | "gone"> {
  const reserved = await GuestUserModel.findOneAndUpdate(
    // $not/$gte also matches accounts that predate the counter (field missing).
    { id: guestId, expiresAt: { $gt: new Date() }, [counter]: { $not: { $gte: max } } },
    { $inc: { [counter]: 1 } }
  );
  if (reserved) return "ok";
  const guest = await GuestUserModel.findOne({ id: guestId, expiresAt: { $gt: new Date() } });
  return guest ? "full" : "gone";
}

export async function releaseGuestCounter(
  guestId: string,
  counter: GuestCounter,
  by = 1
): Promise<void> {
  if (by <= 0) return;
  // Pipeline update clamps at 0, so a double release can never go negative.
  await GuestUserModel.updateOne(
    { id: guestId },
    [{ $set: { [counter]: { $max: [0, { $subtract: [{ $ifNull: [`$${counter}`, 0] }, by] }] } } }],
    { updatePipeline: true }
  );
}

// Gives a spent unit back, for work that was charged up front and then failed
// (an LLM outage, say). Guests get a small lifetime budget, so they must not
// pay for our failures. The `$gt: 0` filter keeps the counter from going
// negative if this is ever called twice for one request.
export async function refundGuestQuota(guestId: string, quota: GuestQuotaName): Promise<void> {
  await GuestUserModel.updateOne(
    { id: guestId, [`usage.${quota}.count`]: { $gt: 0 } },
    { $inc: { [`usage.${quota}.count`]: -1 } }
  );
}
