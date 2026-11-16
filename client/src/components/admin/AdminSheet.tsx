import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { getAdminStatus } from "@/api/admin";
import { cn } from "@/lib/utils";
import { ADMIN_TEXT } from "@/lib/strings";
import TwoFactorSetup from "./TwoFactorSetup";
import UsersTab from "./UsersTab";
import AuditTab from "./AuditTab";

interface AdminSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "users" | "audit";
type Status = { mfaEnabled: boolean; mfaSession: boolean };

// Superadmin user management, rendered conditionally like SettingsSheet (no
// router). Until this session has passed 2FA, only enrollment is shown.
export default function AdminSheet({ open, onOpenChange }: AdminSheetProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("users");

  const loadStatus = useCallback(() => {
    setError(false);
    getAdminStatus().then(setStatus).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (open) loadStatus();
  }, [open, loadStatus]);

  function body() {
    if (error) return <p className="p-5 text-sm text-destructive" role="alert">{ADMIN_TEXT.loadFailed}</p>;
    if (!status) return <p className="p-5 text-sm text-muted-foreground">{ADMIN_TEXT.loading}</p>;
    if (!status.mfaSession) {
      return status.mfaEnabled ? (
        <p className="p-5 text-sm">{ADMIN_TEXT.mfaReloginNeeded}</p>
      ) : (
        <TwoFactorSetup onEnabled={loadStatus} />
      );
    }
    return (
      <>
        <div role="tablist" aria-label={ADMIN_TEXT.title} className="flex gap-1 px-5">
          {(["users", "audit"] as const).map((id) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                tab === id ? "border-b-2 border-indigo-600 text-indigo-700" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {id === "users" ? ADMIN_TEXT.tabUsers : ADMIN_TEXT.tabAudit}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto border-t">{tab === "users" ? <UsersTab /> : <AuditTab />}</div>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-[64rem] max-w-[96vw] p-0">
        <div className="flex h-full flex-col">
          <div className="px-5 pb-2 pt-5">
            <SheetTitle>{ADMIN_TEXT.title}</SheetTitle>
            <SheetDescription className="text-xs">{ADMIN_TEXT.description}</SheetDescription>
          </div>
          {body()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
