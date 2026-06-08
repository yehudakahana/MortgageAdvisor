import { useState, useEffect, useRef } from "react";
import { getClients, getClient, createClient, reExtractDocument, authFetch } from "../api";
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
  const [reExtractingId, setReExtractingId] = useState<string | null>(null);
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

  // Refetch a single client and merge it into local state.
  async function refreshClient(clientId: string): Promise<Client | null> {
    try {
      const client: Client = await getClient(clientId);
      setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
      return client;
    } catch {
      return null;
    }
  }

  // Extraction runs asynchronously on the backend, so poll the client until the
  // given document's extractedData resolves (success or error), then stop.
  async function pollExtraction(clientId: string, docId: string, attempts = 8) {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const client = await refreshClient(clientId);
      const doc = client?.documents.find((d) => d.id === docId);
      if (doc?.extractedData) return;
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
      const res = await authFetch(`/api/upload/${selectedId}`, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const updated: Client = await res.json();
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (fileInputRef.current) fileInputRef.current.value = "";
      const newDoc = updated.documents[updated.documents.length - 1];
      if (newDoc) void pollExtraction(updated.id, newDoc.id);
    } catch {
      setUploadError("העלאה נכשלה. PDF בלבד, מקסימום 10 מגה.");
    } finally {
      setIsUploading(false);
    }
  }

  // Retry extraction for a document whose previous attempt failed.
  async function handleReExtract(docId: string) {
    if (!selectedId) return;
    setReExtractingId(docId);
    try {
      const updated: Client = await reExtractDocument(selectedId, docId);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      // Keep the existing error state so the user can try again.
    } finally {
      setReExtractingId(null);
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
    handleReExtract, reExtractingId,
    searchQuery, setSearchQuery,
  };
}
