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
// Not transactional — two truly simultaneous requests from one guest can both
// pass the check. That is an acceptable off-by-one on a demo quota; the cost
// ceiling it exists to protect is still bounded.
export async function consumeGuestQuota(
  guestId: string,
  quota: GuestQuotaName,
  max: number
): Promise<GuestQuotaResult> {
  const guest = await GuestUserModel.findOne({ id: guestId });
  // The auth middleware already proved the guest exists, so a miss here means
  // the record was cleaned up mid-request. Surfacing it as an error (500) is
  // honest; reporting a made-up reset time would not be.
  if (!guest) throw new Error(`guest ${guestId} not found while spending ${quota} quota`);

  const now = Date.now();
  const current = guest.usage?.[quota];
  const windowExpired =
    !current?.windowStart || now - current.windowStart.getTime() >= GUEST_LIMITS.quotaWindowMs;

  // A rolled-over window starts fresh with this request already counted.
  if (windowExpired) {
    await GuestUserModel.updateOne(
      { id: guestId },
      { $set: { [`usage.${quota}`]: { count: 1, windowStart: new Date(now) } } }
    );
    return { allowed: true, remaining: max - 1 };
  }

  if (current.count >= max) {
    return { allowed: false, resetInMinutes: minutesUntilReset(current.windowStart, now) };
  }

  await GuestUserModel.updateOne({ id: guestId }, { $inc: { [`usage.${quota}.count`]: 1 } });
  return { allowed: true, remaining: max - (current.count + 1) };
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
