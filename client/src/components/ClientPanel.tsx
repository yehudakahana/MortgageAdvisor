import { useState, useEffect, useRef } from "react";
import { getClients, createClient } from "../api";

interface Document {
  id: string;
  type: string;
  filename: string;
  uploadedAt: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  documents: Document[];
}

export default function ClientPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [uploadType, setUploadType] = useState<string>("paystub");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data);
    } catch {
      // silently ignore on initial load
    }
  }

  useEffect(() => { loadClients(); }, []);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim() || !phone.trim()) {
      setFormError("Name and phone are required.");
      return;
    }
    setSaving(true);
    try {
      const client = await createClient({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      setClients((prev) => [...prev, client]);
      setSelectedId(client.id);
      setShowForm(false);
      setName(""); setPhone(""); setEmail("");
    } catch {
      setFormError("Failed to create client.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!selectedId || !fileRef.current?.files?.[0]) return;
    const file = fileRef.current.files[0];
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", uploadType);
      const res = await fetch(`/api/upload/${selectedId}`, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const updated: Client = await res.json();
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setUploadError("Upload failed. PDF only, max 10 MB.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <aside className="client-panel">
      <div className="panel-header">
        <span>Clients</span>
        <button className="btn-add" onClick={() => { setShowForm((v) => !v); setFormError(""); }}>
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showForm && (
        <form className="client-form" onSubmit={handleCreate}>
          <input placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {formError && <p className="error">{formError}</p>}
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Client"}</button>
        </form>
      )}

      <ul className="client-list">
        {clients.length === 0 && <li className="empty">No clients yet.</li>}
        {clients.map((c) => (
          <li
            key={c.id}
            className={c.id === selectedId ? "active" : ""}
            onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
          >
            <span className="client-name">{c.name}</span>
            <span className="client-phone">{c.phone}</span>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="upload-section">
          <p className="section-title">Files — {selected.name}</p>

          <ul className="doc-list">
            {selected.documents.length === 0 && <li className="empty">No files uploaded.</li>}
            {selected.documents.map((d) => (
              <li key={d.id}>
                <span className="doc-type">{d.type}</span>
                <span className="doc-name">{d.filename}</span>
              </li>
            ))}
          </ul>

          <div className="upload-controls">
            <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
              <option value="paystub">Paystub</option>
              <option value="bank_statement">Bank Statement</option>
              <option value="id_card">ID Card</option>
              <option value="other">Other</option>
            </select>
            <input type="file" accept=".pdf" ref={fileRef} />
            <button onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
            {uploadError && <p className="error">{uploadError}</p>}
          </div>
        </div>
      )}
    </aside>
  );
}
