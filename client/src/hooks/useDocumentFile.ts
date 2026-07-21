import { useState } from "react";
import { getDocumentUrl } from "../api";
import { toast } from "../lib/toast";
import { DOCUMENTS_TEXT } from "@/lib/strings";

type Action = "view" | "download";

// Fetches a short-lived signed URL for a document and either previews it inline
// or forces a download. `loading` names the in-flight action so each button can
// show its own spinner (and both disable while either is running). On failure —
// most often a legacy record with no stored file (backend 404) — we surface a
// toast instead of opening a blank browser tab.
export function useDocumentFile(clientId: string, docId: string) {
  const [loading, setLoading] = useState<Action | null>(null);

  // Resolve the URL FIRST, then open a tab only on success — no blank-tab flash
  // when the file is missing. If the popup is blocked, fall back to a toast.
  async function open() {
    setLoading("view");
    try {
      const { url } = await getDocumentUrl(clientId, docId, "view");
      // Not passing "noopener" here: with it, window.open returns null even on
      // success, which we can't distinguish from a blocked popup. Null the
      // opener manually instead (best-effort) to avoid reverse tabnabbing.
      const win = window.open(url, "_blank");
      if (win) win.opener = null;
      else toast(DOCUMENTS_TEXT.popupBlocked);
    } catch {
      toast(DOCUMENTS_TEXT.openFailed);
    } finally {
      setLoading(null);
    }
  }

  // The signed URL carries Content-Disposition: attachment, so navigating to it
  // downloads without leaving the page. A hidden iframe triggers that fetch
  // without opening a blank tab or replacing the current document.
  //
  // The iframe fires no load event for an attachment response (the browser
  // cancels the navigation and hands off to its download manager), so we cannot
  // track the transfer itself — the spinner only covers the presign request.
  // A toast confirms the hand-off so the user isn't left wondering.
  async function download() {
    setLoading("download");
    try {
      const { url } = await getDocumentUrl(clientId, docId, "download");
      const iframe = window.document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      window.document.body.appendChild(iframe);
      // Give the browser time to start the download before removing the iframe.
      window.setTimeout(() => iframe.remove(), 60_000);
      toast(DOCUMENTS_TEXT.downloadStarted, "success");
    } catch {
      toast(DOCUMENTS_TEXT.downloadFailed);
    } finally {
      setLoading(null);
    }
  }

  return { loading, open, download };
}
