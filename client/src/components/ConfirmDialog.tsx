import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMMON_TEXT } from "@/lib/strings";

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Lightweight modal confirmation dialog (replaces window.confirm).
export default function ConfirmDialog({
  open,
  message,
  confirmLabel = COMMON_TEXT.delete,
  cancelLabel = COMMON_TEXT.cancel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden="true" />
      <Card role="dialog" aria-modal="true" aria-label={message} className="relative z-10 w-full max-w-sm p-5 shadow-lg">
        <p className="text-sm leading-relaxed">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} size="sm" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button size="sm" variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
