import { useState } from "react";
import { createClient } from "../api";
import type { Client } from "../types/client";
import { CLIENTS_TEXT } from "@/lib/strings";

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
      setFormError(CLIENTS_TEXT.requiredFields);
      return;
    }
    setSaving(true);
    try {
      const client = await createClient({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      onCreated(client);
      setIsCreatingClient(false);
      setName(""); setPhone(""); setEmail("");
    } catch (err) {
      // Guest client-cap 403s carry a Hebrew explanation — show it verbatim.
      // English messages are internal fallbacks, not user-facing.
      const message = err instanceof Error && /[֐-׿]/.test(err.message) ? err.message : "";
      setFormError(message || CLIENTS_TEXT.createFailed);
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
