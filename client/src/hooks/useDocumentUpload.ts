import { useState, useRef } from "react";
import { getClient, reExtractDocument, uploadDocument } from "../api";
import type { Client } from "../types/client";
import { useClients } from "../context/ClientsContext";
import { DOCUMENTS_TEXT } from "@/lib/strings";

// Document upload, extraction polling, and re-extract logic for the selected
// client. Composed by useClientPanel; merges updates into the shared list.
export function useDocumentUpload(selectedId: string | null) {
  const { setClients } = useClients();
  const [uploadType, setUploadType] = useState<string>("paystub");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [reExtractingId, setReExtractingId] = useState<string | null>(null);
  const [timedOutDocIds, setTimedOutDocIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refetch a single client and merge it into the shared list.
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
    let doc: Client["documents"][number] | undefined;
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const client = await refreshClient(clientId);
      doc = client?.documents.find((d) => d.id === docId);
      if (doc?.extractedData) {
        setTimedOutDocIds((prev) => prev.filter((id) => id !== docId));
        return;
      }
    }
    // Polling gave up while extraction may still be running on the backend.
    // Skip if the document was deleted mid-poll — nothing to flag anymore.
    if (!doc) return;
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
      setUploadError(DOCUMENTS_TEXT.uploadFailed);
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

  // Drop the timed-out flag for a document (e.g. after it is deleted).
  function clearDocTimeout(docId: string) {
    setTimedOutDocIds((prev) => prev.filter((id) => id !== docId));
  }

  // Reset transient upload UI state (used when switching clients).
  function resetUploadState() {
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return {
    uploadType, setUploadType, isUploading, uploadError,
    handleFileSelect, fileInputRef,
    handleReExtract, reExtractingId, timedOutDocIds,
    clearDocTimeout, resetUploadState,
  };
}
