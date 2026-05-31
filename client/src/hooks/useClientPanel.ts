import { useState, useEffect, useRef } from "react";
import { getClients, createClient } from "../api";
import type { Client } from "../types/client";

export function useClientPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadType, setUploadType] = useState<string>("paystub");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data);
    } catch {
      // silently ignore on initial load
    }
  }

  useEffect(() => { loadClients(); }, []);

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
      setClients((prev) => [...prev, client]);
      setSelectedId(client.id);
      setSearchQuery("");
      setIsCreatingClient(false);
      setName(""); setPhone(""); setEmail("");
    } catch {
      setFormError("יצירת לקוח נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", uploadType);
      const res = await fetch(`/api/upload/${selectedId}`, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const updated: Client = await res.json();
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("העלאה נכשלה. PDF בלבד, מקסימום 10 מגה.");
    } finally {
      setIsUploading(false);
    }
  }

  function selectClient(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredClients = q
    ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
    : clients;

  return {
    clients, filteredClients, selectedId, selectClient,
    isCreatingClient, setIsCreatingClient,
    name, setName, phone, setPhone, email, setEmail,
    saving, formError, setFormError, handleCreate,
    uploadType, setUploadType, isUploading, uploadError,
    handleFileSelect, fileInputRef,
    searchQuery, setSearchQuery,
  };
}
