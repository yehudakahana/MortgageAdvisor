import { useState, useRef } from "react";
import { getClient, reExtractDocument, uploadDocument, getValidation } from "../api";
import type { ValidationReport } from "../api";
import type { Client } from "../types/client";
import { useClients } from "../context/ClientsContext";
import { isDocDeleted, stripDeletedDocs } from "@/lib/deletedDocs";
import { DOCUMENTS_TEXT } from "@/lib/strings";

// Outcome of a single file within an upload batch, shown in the final dialog.
export interface UploadResult {
  filename: string;
  ok: boolean;
  reason?: string;
}

// Live stage of the automatic post-upload flow, surfaced inline as a progress
// indicator: upload -> background extraction -> validation against rules.
export type FlowStage = "idle" | "uploading" | "extracting" | "validating" | "done";

// Everything the end-of-flow dialog shows: per-file upload outcomes plus the
// validation report (null when the validation call itself failed).
export interface FlowReport {
  uploads: UploadResult[];
  validation: ValidationReport | null;
  validationError: boolean;
}

function formatUploadError(err: unknown): string {
  if (err instanceof TypeError) return DOCUMENTS_TEXT.networkError;
  if (err instanceof Error && err.message) return err.message;
  return DOCUMENTS_TEXT.uploadFailed;
}

// Document upload, extraction polling, and (if the advisor has validation
// rules) an automatic document check — all driven from one file selection.
export function useDocumentUpload(selectedId: string | null) {
  const { clients, setClients } = useClients();
  const [uploadType, setUploadType] = useState<string>("paystub");
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [flowStage, setFlowStage] = useState<FlowStage>("idle");
  const [flowReport, setFlowReport] = useState<FlowReport | null>(null);
  const [reExtractingId, setReExtractingId] = useState<string | null>(null);
  const [timedOutDocIds, setTimedOutDocIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  async function refreshClient(clientId: string): Promise<Client | null> {
    try {
      const client = stripDeletedDocs<Client>(await getClient(clientId));
      setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
      return client;
    } catch {
      return null;
    }
  }

  // Polls the client until the given document's extraction resolves (success or
  // error), then stops. ~90s window comfortably exceeds the worst-case backend
  // time (Gemini 503 retries + Claude fallback).
  async function pollExtraction(clientId: string, docId: string, attempts = 30) {
    let doc: Client["documents"][number] | undefined;
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      if (isDocDeleted(docId)) return;
      const client = await refreshClient(clientId);
      doc = client?.documents.find((d) => d.id === docId);
      if (doc?.extractedData) {
        setTimedOutDocIds((prev) => prev.filter((id) => id !== docId));
        return;
      }
    }
    if (!doc) return;
    setTimedOutDocIds((prev) => (prev.includes(docId) ? prev : [...prev, docId]));
  }

  // Stale-selection guard: the user switched clients mid-flow, so drop the flow
  // silently rather than popping a dialog under the wrong client.
  function abandoned(clientId: string): boolean {
    if (selectedIdRef.current === clientId) return false;
    setFlowStage("idle");
    return true;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !selectedId) return;
    const clientId = selectedId;
    setFlowReport(null);
    setFlowStage("uploading");

    let knownIds = new Set(
      clients.find((c) => c.id === clientId)?.documents.map((d) => d.id) ?? []
    );
    const uploads: UploadResult[] = [];
    const newDocIds: string[] = [];

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
        if (newDoc) newDocIds.push(newDoc.id);
        uploads.push({ filename: file.name, ok: true });
      } catch (err) {
        uploads.push({ filename: file.name, ok: false, reason: formatUploadError(err) });
      }
    }
    setUploadProgress(null);
    if (abandoned(clientId)) return;

    // Nothing extracted (every upload failed): report the uploads and stop.
    if (newDocIds.length === 0) {
      setFlowReport({ uploads, validation: null, validationError: false });
      setFlowStage("done");
      return;
    }

    setFlowStage("extracting");
    await Promise.all(newDocIds.map((id) => pollExtraction(clientId, id)));
    if (abandoned(clientId)) return;

    setFlowStage("validating");
    let validation: ValidationReport | null = null;
    let validationError = false;
    try {
      validation = await getValidation(clientId);
    } catch {
      validationError = true;
    }
    if (abandoned(clientId)) return;

    setFlowReport({ uploads, validation, validationError });
    setFlowStage("done");
  }

  function closeReport() {
    setFlowReport(null);
    setFlowStage("idle");
  }

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

  function clearDocTimeout(docId: string) {
    setTimedOutDocIds((prev) => prev.filter((id) => id !== docId));
  }

  function resetUploadState() {
    setFlowReport(null);
    setFlowStage("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return {
    uploadType, setUploadType,
    isUploading: uploadProgress !== null, uploadProgress,
    flowStage, flowReport, closeReport,
    handleFileSelect, fileInputRef,
    handleReExtract, reExtractingId, timedOutDocIds,
    clearDocTimeout, resetUploadState,
  };
}
