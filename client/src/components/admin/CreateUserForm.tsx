import { useState } from "react";
import { createUser } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { ADMIN_TEXT } from "@/lib/strings";
import UserFormFields, { EMPTY_USER_FORM } from "./UserFormFields";
import { toFields } from "./UserDialogs";

interface CreateUserFormProps {
  onCreated: (link: string) => void;
}

// New paid customer: the account is created without a password and the admin
// gets a one-time invite link to send. The user picks the password herself.
export default function CreateUserForm({ onCreated }: CreateUserFormProps) {
  const [values, setValues] = useState(EMPTY_USER_FORM);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { link } = await createUser({ username: values.username.trim(), ...toFields(values) });
      setValues(EMPTY_USER_FORM);
      onCreated(link);
    } catch (err) {
      setError((err instanceof Error && err.message) || ADMIN_TEXT.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">{ADMIN_TEXT.newUser}</h3>
      <UserFormFields values={values} onChange={setValues} showUsername idPrefix="new-user" />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? ADMIN_TEXT.creating : ADMIN_TEXT.create}</Button>
    </form>
  );
}
