import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminUser, UserFields } from "@/api/admin";
import { ADMIN_TEXT, COMMON_TEXT } from "@/lib/strings";
import UserFormFields, { EMPTY_USER_FORM, UserFormValues } from "./UserFormFields";

export function toFormValues(user: AdminUser): UserFormValues {
  return {
    ...EMPTY_USER_FORM,
    email: user.email,
    name: user.name,
    phone: user.phone,
    paidUntil: user.paidUntil ? user.paidUntil.slice(0, 10) : "",
    notes: user.notes,
  };
}

export function toFields(v: UserFormValues): UserFields {
  return {
    ...(v.email ? { email: v.email } : {}),
    name: v.name,
    phone: v.phone,
    notes: v.notes,
    paidUntil: v.paidUntil || null,
  };
}

interface EditProps {
  user: AdminUser | null;
  onClose: () => void;
  onSave: (user: AdminUser, fields: UserFields) => Promise<void>;
}

export function EditUserDialog({ user, onClose, onSave }: EditProps) {
  const [values, setValues] = useState(EMPTY_USER_FORM);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) setValues(toFormValues(user));
  }, [user]);

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogTitle className="text-right">{user && ADMIN_TEXT.editTitle(user.username)}</DialogTitle>
        <DialogDescription className="sr-only">{ADMIN_TEXT.description}</DialogDescription>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            setBusy(true);
            await onSave(user, toFields(values)).finally(() => setBusy(false));
          }}
        >
          <UserFormFields values={values} onChange={setValues} showUsername={false} idPrefix="edit-user" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{COMMON_TEXT.cancel}</Button>
            <Button type="submit" disabled={busy}>{ADMIN_TEXT.save}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteProps {
  user: AdminUser | null;
  onClose: () => void;
  onDelete: (user: AdminUser, confirm: string) => Promise<void>;
}

// Irreversible: the admin must type the exact username (checked again by the server).
export function DeleteUserDialog({ user, onClose, onDelete }: DeleteProps) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setTyped(""), [user]);

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogTitle className="text-right">{user && ADMIN_TEXT.deleteTitle(user.username)}</DialogTitle>
        <DialogDescription className="text-right text-destructive">{ADMIN_TEXT.deleteWarning}</DialogDescription>
        <div className="space-y-1.5">
          <Label htmlFor="delete-confirm">{user && ADMIN_TEXT.deleteTypeToConfirm(user.username)}</Label>
          <Input id="delete-confirm" dir="ltr" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{COMMON_TEXT.cancel}</Button>
          <Button
            variant="destructive"
            disabled={busy || !user || typed !== user.username}
            onClick={async () => {
              if (!user) return;
              setBusy(true);
              await onDelete(user, typed).finally(() => setBusy(false));
            }}
          >
            {COMMON_TEXT.delete}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
