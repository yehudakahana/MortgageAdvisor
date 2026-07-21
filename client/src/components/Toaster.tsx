import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribe, dismissToast, type Toast } from "@/lib/toast";
import { COMMON_TEXT } from "@/lib/strings";

// Renders the active toasts from the store. Mount once, near the app root.
export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 start-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            "flex items-center gap-2 w-full rounded-lg border px-3.5 py-2.5 shadow-lg text-sm bg-card",
            t.variant === "error" ? "border-destructive/30 text-destructive" : "border-emerald-200 text-emerald-700"
          )}
        >
          {t.variant === "error" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button type="button" aria-label={COMMON_TEXT.close} onClick={() => dismissToast(t.id)} className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
