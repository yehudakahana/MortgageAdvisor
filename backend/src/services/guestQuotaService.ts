import { GuestUserModel } from "../models/GuestUser";
import { GUEST_LIMITS } from "../constants/guest";

export type GuestQuotaName = "chat" | "reExtract";

// Consumes one unit of a guest's rolling hourly quota and returns how many
// units are left afterwards, or null when the quota is already exhausted.
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
): Promise<number | null> {
  const guest = await GuestUserModel.findOne({ id: guestId });
  if (!guest) return null;

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
    return max - 1;
  }

  if (current.count >= max) return null;

  await GuestUserModel.updateOne({ id: guestId }, { $inc: { [`usage.${quota}.count`]: 1 } });
  return max - (current.count + 1);
}
