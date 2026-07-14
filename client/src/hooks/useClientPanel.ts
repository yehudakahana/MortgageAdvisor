import { useState } from "react";
import { deleteClient, deleteDocument } from "../api";
import type { Client } from "../types/client";
import { useClientForm } from "./useClientForm";
import { useClients } from "../context/ClientsContext";
import { useDocumentUpload } from "./useDocumentUpload";

export function useClientPanel() {
  const { clients, setClients, isLoading, loadError, loadClients } = useClients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const upload = useDocumentUpload(selectedId);

  const form = useClientForm((client) => {
    setClients((prev) => [...prev, client]);
    setSelectedId(client.id);
    setSearchQuery("");
  });

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
      upload.clearDocTimeout(docId);
    } catch {
      window.alert("מחיקת המסמך נכשלה. נסו שוב.");
    } finally {
      setDeletingDocId(null);
    }
  }

  function selectClient(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
    upload.resetUploadState();
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredClients = q
    ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
    : clients;

  return {
    clients, filteredClients, isLoading, loadError, loadClients, selectedId, selectClient,
    ...form,
    ...upload,
    handleDeleteClient, deletingClientId,
    handleDeleteDocument, deletingDocId,
    searchQuery, setSearchQuery,
  };
}
