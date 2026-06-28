import { useState } from "react";
import { createClient } from "../api";
import type { Client } from "../types/client";

// Client-creation form state and submit logic. Composed by useClientPanel,
// which handles list-level side effects via the onCreated callback.
export function useClientForm(onCreated: (client: Client) => void) {
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim() || !phone.trim()) {
      setFormError("שם וטלפון הם שדות חובה.");
      return;
    }
    setSaving(true);
    try {
      const client = await createClient({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      onCreated(client);
      setIsCreatingClient(false);
      setName(""); setPhone(""); setEmail("");
    } catch {
      setFormError("יצירת לקוח נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  return {
    isCreatingClient, setIsCreatingClient,
    name, setName, phone, setPhone, email, setEmail,
    saving, formError, setFormError, handleCreate,
  };
}
