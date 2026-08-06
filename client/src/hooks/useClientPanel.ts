import { useState } from "react";
import { deleteClient, deleteDocument } from "../api";
import { markDocDeleted } from "@/lib/deletedDocs";
import { CLIENTS_TEXT } from "@/lib/strings";
import type { Client } from "../types/client";
import { useClientForm } from "./useClientForm";
import { useClients } from "../context/ClientsContext";
import { useDocumentUpload } from "./useDocumentUpload";

type PendingDelete =
  | { kind: "client"; id: string }
  | { kind: "document"; id: string; clientId: string };

export function useClientPanel() {
  const { clients, setClients, isLoading, loadError, loadClients } = useClients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const upload = useDocumentUpload(selectedId);

  const form = useClientForm((client) => {
    setClients((prev) => [...prev, client]);
    setSelectedId(client.id);
    setSearchQuery("");
  });

  // Deletion is irreversible (removes the stored files too), so always confirm via the dialog.
  function handleDeleteClient(id: string) {
    setDeleteError("");
    setPendingDelete({ kind: "client", id });
  }

  function handleDeleteDocument(docId: string) {
    if (!selectedId) return;
    setDeleteError("");
    setPendingDelete({ kind: "document", id: docId, clientId: selectedId });
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const pending = pendingDelete;
    setPendingDelete(null);
    if (pending.kind === "client") await performDeleteClient(pending.id);
    else await performDeleteDocument(pending.clientId, pending.id);
  }

  async function performDeleteClient(id: string) {
    setDeletingClientId(id);
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    } catch (err) {
      // 404 = already gone server-side (stale row) — dropping it locally IS
      // the deletion the user asked for.
      if ((err as { status?: number }).status === 404) {
        setClients((prev) => prev.filter((c) => c.id !== id));
        setSelectedId((prev) => (prev === id ? null : prev));
      } else {
        setDeleteError(CLIENTS_TEXT.deleteClientFailed);
      }
    } finally {
      setDeletingClientId(null);
    }
  }

  async function performDeleteDocument(clientId: string, docId: string) {
    setDeletingDocId(docId);
    try {
      const updated: Client = await deleteDocument(clientId, docId);
      // Tombstone first: any in-flight refetch that still carries this doc
      // must not resurrect its row (delete vs extraction-poll race).
      markDocDeleted(docId);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      upload.clearDocTimeout(docId);
    } catch (err) {
      // 404 = the doc no longer exists server-side (ghost row kept alive by a
      // stale refetch, or an orphaned AI summary) — remove the row locally.
      if ((err as { status?: number }).status === 404) {
        markDocDeleted(docId);
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? { ...c, documents: c.documents.filter((d) => d.id !== docId) }
              : c
          )
        );
        upload.clearDocTimeout(docId);
      } else {
        setDeleteError(CLIENTS_TEXT.deleteDocumentFailed);
      }
    } finally {
      setDeletingDocId(null);
    }
  }

  const deleteConfirmMessage =
    pendingDelete?.kind === "client"
      ? CLIENTS_TEXT.confirmDeleteClient
      : CLIENTS_TEXT.confirmDeleteDocument;

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
    pendingDelete, deleteConfirmMessage, confirmDelete, cancelDelete, deleteError,
    searchQuery, setSearchQuery,
  };
}
