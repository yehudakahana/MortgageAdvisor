import { useState, useEffect, useRef } from "react";
import { getClients, createClient } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

const DOC_TYPE_LABELS: Record<string, string> = {
  paystub: "תלוש שכר",
  bank_statement: "דף חשבון",
  id_card: "תעודת זהות",
  other: "אחר",
};

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
      setFormError("שם וטלפון הם שדות חובה.");
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
      setFormError("יצירת לקוח נכשלה.");
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
      setUploadError("העלאה נכשלה. PDF בלבד, מקסימום 10 מגה.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <aside className="w-72 flex-shrink-0 border-s border-border bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
        <h2 className="font-semibold text-sm">לקוחות</h2>
        <Button
          size="sm"
          variant={showForm ? "outline" : "default"}
          onClick={() => { setShowForm((v) => !v); setFormError(""); }}
        >
          {showForm ? "ביטול" : "+ חדש"}
        </Button>
      </div>

      {showForm && (
        <Card className="m-3 shadow-sm border-border">
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="client-name">שם מלא *</Label>
                <Input id="client-name" placeholder="ישראל ישראלי" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-phone">טלפון *</Label>
                <Input id="client-phone" placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-email">אימייל</Label>
                <Input id="client-email" placeholder="mail@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {formError && <p className="text-destructive text-xs">{formError}</p>}
              <Button type="submit" disabled={saving} className="w-full" size="sm">
                {saving ? "שומר..." : "הוסף לקוח"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-y-auto">
        {clients.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">אין לקוחות עדיין.</p>
        ) : (
          <ul className="divide-y divide-border">
            {clients.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                className={cn(
                  "px-4 py-3 cursor-pointer transition-colors hover:bg-accent",
                  c.id === selectedId && "bg-primary/10 border-s-2 border-s-primary"
                )}
              >
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="border-t border-border p-3 space-y-3 bg-muted/20 flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            קבצים — {selected.name}
          </p>

          {selected.documents.length === 0 ? (
            <p className="text-xs text-muted-foreground">לא הועלו קבצים.</p>
          ) : (
            <ul className="space-y-1.5">
              {selected.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    {DOC_TYPE_LABELS[d.type] ?? d.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">{d.filename}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paystub">תלוש שכר</SelectItem>
                <SelectItem value="bank_statement">דף חשבון</SelectItem>
                <SelectItem value="id_card">תעודת זהות</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="file"
              accept=".pdf"
              ref={fileRef}
              className="w-full text-xs text-muted-foreground cursor-pointer"
            />
            <Button onClick={handleUpload} disabled={uploading} className="w-full" size="sm">
              {uploading ? "מעלה..." : "העלה PDF"}
            </Button>
            {uploadError && <p className="text-destructive text-xs">{uploadError}</p>}
          </div>
        </div>
      )}
    </aside>
  );
}
