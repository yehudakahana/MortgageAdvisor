import { useState, useEffect, useRef } from "react";
import { getClients, getClient, reExtractDocument, uploadDocument, deleteClient, deleteDocument } from "../api";
import type { Client } from "../types/client";
import { useClientForm } from "./useClientForm";

export function useClientPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<string>("paystub");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [reExtractingId, setReExtractingId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [timedOutDocIds, setTimedOutDocIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useClientForm((client) => {
    setClients((prev) => [...prev, client]);
    setSelectedId(client.id);
    setSearchQuery("");
  });

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data);
    } catch {
      // silently ignore on initial load
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadClients(); }, []);

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
  // The window (attempts × interval) must comfortably exceed the worst-case
  // backend time: Gemini's 503 retries (1s+2s+4s backoff) plus the Claude
  // fallback request. ~90s avoids giving up while extraction is still running.
  async function pollExtraction(clientId: string, docId: string, attempts = 30) {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const client = await refreshClient(clientId);
      const doc = client?.documents.find((d) => d.id === docId);
      if (doc?.extractedData) {
        setTimedOutDocIds((prev) => prev.filter((id) => id !== docId));
        return;
      }
    }
    // Polling gave up while extraction may still be running on the backend.
    setTimedOutDocIds((prev) => (prev.includes(docId) ? prev : [...prev, docId]));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);
      const updated: Client = await uploadDocument(selectedId, formData);
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
    setTimedOutDocIds((prev) => prev.filter((id) => id !== docId));
    try {
      const updated: Client = await reExtractDocument(selectedId, docId);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      // Keep the existing error state so the user can try again.
    } finally {
      setReExtractingId(null);
    }
  }

  // Deletion is irreversible (removes the stored files too), so always confirm.
  async function handleDeleteClient(id: string) {
    if (!window.confirm("למחוק את הלקוח וכל המסמכים שלו? פעולה זו אינה הפיכה.")) return;
    setDeletingClientId(id);
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    } catch {
      window.alert("מחיקת הלקוח נכשלה. נסו שוב.");
    } finally {
      setDeletingClientId(null);
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!selectedId) return;
    if (!window.confirm("למחוק את המסמך? פעולה זו אינה הפיכה.")) return;
    setDeletingDocId(docId);
    try {
      const updated: Client = await deleteDocument(selectedId, docId);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setTimedOutDocIds((prev) => prev.filter((id) => id !== docId));
    } catch {
      window.alert("מחיקת המסמך נכשלה. נסו שוב.");
    } finally {
      setDeletingDocId(null);
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
    clients, filteredClients, isLoading, selectedId, selectClient,
    ...form,
    uploadType, setUploadType, isUploading, uploadError,
    handleFileSelect, fileInputRef,
    handleReExtract, reExtractingId, timedOutDocIds,
    handleDeleteClient, deletingClientId,
    handleDeleteDocument, deletingDocId,
    searchQuery, setSearchQuery,
  };
}
