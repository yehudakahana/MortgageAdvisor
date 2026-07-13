import { useState } from "react";
import { getDocumentUrl } from "../api";

type Action = "view" | "download";

// Fetches a short-lived signed URL for a document and either previews it inline
// or forces a download. `loading` names the in-flight action so each button can
// show its own spinner (and both disable while either is running).
export function useDocumentFile(clientId: string, docId: string) {
  const [loading, setLoading] = useState<Action | null>(null);

  // Open a blank tab synchronously so the popup blocker doesn't kill it after
  // the async presign, then point it at the signed URL.
  async function open() {
    const win = window.open("", "_blank");
    setLoading("view");
    try {
      const { url } = await getDocumentUrl(clientId, docId, "view");
      if (win) win.location.href = url;
    } catch {
      win?.close();
    } finally {
      setLoading(null);
    }
  }

  // The signed URL carries Content-Disposition: attachment, so navigating to it
  // downloads without leaving the page. A hidden iframe triggers that fetch
  // without opening a blank tab or replacing the current document.
  async function download() {
    setLoading("download");
    try {
      const { url } = await getDocumentUrl(clientId, docId, "download");
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      // Give the browser time to start the download before removing the iframe.
      window.setTimeout(() => iframe.remove(), 60_000);
    } catch {
      // ignore — the file simply won't download
    } finally {
      setLoading(null);
    }
  }

  return { loading, open, download };
}
