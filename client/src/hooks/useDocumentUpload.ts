import { useState, useRef } from "react";
import { getClient, reExtractDocument, uploadDocument } from "../api";
import type { Client } from "../types/client";
import { useClients } from "../context/ClientsContext";
import { DOCUMENTS_TEXT } from "@/lib/strings";

// Outcome of a single file within an upload batch, shown in the summary dialog.
export interface UploadResult {
  filename: string;
  ok: boolean;
  reason?: string;
}

// A fetch rejection (network down) is a TypeError; a server rejection carries
// the backend's Hebrew message (thrown by the api layer). Empty message means
// the server gave no readable reason — use the generic fallback.
function formatUploadError(err: unknown): string {
  if (err instanceof TypeError) return DOCUMENTS_TEXT.networkError;
  if (err instanceof Error && err.message) return err.message;
  return DOCUMENTS_TEXT.uploadFailed;
}

// Document upload, extraction polling, and re-extract logic for the selected
// client. Composed by useClientPanel; merges updates into the shared list.
export function useDocumentUpload(selectedId: string | null) {
  const { clients, setClients } = useClients();
  const [uploadType, setUploadType] = useState<string>("paystub");
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<UploadResult[] | null>(null);
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

  // Uploads the selection sequentially; one failed file never aborts the rest.
  // Every file's outcome is collected and shown in the summary dialog at the end.
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // Clear immediately so re-selecting the same files fires change again.
    e.target.value = "";
    if (files.length === 0 || !selectedId) return;
    const clientId = selectedId;
    setBatchResults(null);

    // Known doc IDs let us find each response's new document reliably — the
    // "last in array" heuristic breaks once several uploads happen in a row.
    let knownIds = new Set(
      clients.find((c) => c.id === clientId)?.documents.map((d) => d.id) ?? []
    );

    const results: UploadResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", uploadType);
        const updated: Client = await uploadDocument(clientId, formData);
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        const newDoc = updated.documents.find((d) => !knownIds.has(d.id));
        knownIds = new Set(updated.documents.map((d) => d.id));
        if (newDoc) void pollExtraction(updated.id, newDoc.id);
        results.push({ filename: file.name, ok: true });
      } catch (err) {
        results.push({ filename: file.name, ok: false, reason: formatUploadError(err) });
      }
    }
    setUploadProgress(null);
    setBatchResults(results);
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

  function clearBatchResults() {
    setBatchResults(null);
  }

  // Reset transient upload UI state (used when switching clients).
  function resetUploadState() {
    setBatchResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return {
    uploadType, setUploadType,
    isUploading: uploadProgress !== null, uploadProgress,
    batchResults, clearBatchResults,
    handleFileSelect, fileInputRef,
    handleReExtract, reExtractingId, timedOutDocIds,
    clearDocTimeout, resetUploadState,
  };
}
