import { Badge } from "@/components/ui/badge";
import { GUEST_TEXT } from "@/lib/strings";
import { useAuth } from "../auth/AuthContext";
import { useGuestMode } from "../context/GuestModeContext";

// Header badge for guest mode. The quota part appears once the first chat
// response reports remainingMessages (the backend is the source of truth).
export default function GuestBadge() {
  const { isGuest } = useAuth();
  const { remainingMessages } = useGuestMode();

  if (!isGuest) return null;

  return (
    <Badge
      variant="secondary"
      className="bg-white/15 text-white border border-white/25 hover:bg-white/15 gap-1.5 whitespace-nowrap"
    >
      <span>{GUEST_TEXT.badge}</span>
      {remainingMessages !== null && (
        <span className="text-white/70 max-md:hidden">
          · {GUEST_TEXT.badgeQuota(remainingMessages)}
        </span>
      )}
    </Badge>
  );
}
