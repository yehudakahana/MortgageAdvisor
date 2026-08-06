import { MessageCircle, Users, Upload, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GUEST_TEXT } from "@/lib/strings";
import { useAuth } from "../auth/AuthContext";
import { useGuestMode } from "../context/GuestModeContext";

// One-time welcome explaining guest-mode limits, shown right after a guest
// lands on the dashboard. The "seen" flag lives in memory (per session).
export default function GuestWelcomeDialog() {
  const { isGuest } = useAuth();
  const { welcomeSeen, markWelcomeSeen } = useGuestMode();

  const limits = [
    { icon: MessageCircle, text: GUEST_TEXT.welcomeLimitChat },
    { icon: Users, text: GUEST_TEXT.welcomeLimitClients },
    { icon: Upload, text: GUEST_TEXT.welcomeLimitUploads },
    { icon: Clock, text: GUEST_TEXT.welcomeLimitTtl },
  ];

  return (
    <Dialog open={isGuest && !welcomeSeen} onOpenChange={(open) => !open && markWelcomeSeen()}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogTitle className="text-right">{GUEST_TEXT.welcomeTitle}</DialogTitle>
        <DialogDescription className="text-right">{GUEST_TEXT.welcomeIntro}</DialogDescription>
        <ul className="space-y-2.5 my-2">
          {limits.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 text-sm">
              <Icon className="w-4 h-4 text-indigo-700 flex-shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <Button onClick={markWelcomeSeen} className="w-full">
          {GUEST_TEXT.welcomeConfirm}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
