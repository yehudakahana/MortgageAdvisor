import { useState, useEffect, useRef } from "react";
import { getClients, createClient } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, UserPlus, Users } from "lucide-react";
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

const DOC_TYPE_STYLES: Record<string, string> = {
  paystub: "bg-emerald-50 text-emerald-700 border-emerald-200",
  bank_statement: "bg-blue-50 text-blue-700 border-blue-200",
  id_card: "bg-amber-50 text-amber-700 border-amber-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
};

function ClientAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
      {initials}
    </div>
  );
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
  const [selectedFile, setSelectedFile] = useState("");
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
      setSelectedFile("");
    } catch {
      setUploadError("העלאה נכשלה. PDF בלבד, מקסימום 10 מגה.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <aside className="w-80 flex-shrink-0 border-s border-border/70 bg-card flex flex-col overflow-hidden shadow-[-4px_0_20px_-4px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-gradient-to-b from-slate-50 to-card">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground/70" />
          <h2 className="font-semibold text-sm">לקוחות</h2>
          {clients.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              {clients.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={showForm ? "outline" : "default"}
          className={cn(
            "h-7 gap-1 text-xs",
            !showForm && "bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 shadow-sm border-0"
          )}
          onClick={() => { setShowForm((v) => !v); setFormError(""); }}
        >
          {showForm ? (
            "ביטול"
          ) : (
            <>
              <UserPlus className="w-3 h-3" />
              <span>חדש</span>
            </>
          )}
        </Button>
      </div>

      {/* New Client Form */}
      {showForm && (
        <Card className="m-3 shadow-sm border-border/60 bg-slate-50/70">
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="client-name" className="text-xs font-medium">שם מלא *</Label>
                <Input id="client-name" placeholder="ישראל ישראלי" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-phone" className="text-xs font-medium">טלפון *</Label>
                <Input id="client-phone" placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-email" className="text-xs font-medium">אימייל</Label>
                <Input id="client-email" placeholder="mail@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
              </div>
              {formError && <p className="text-destructive text-xs">{formError}</p>}
              <Button
                type="submit"
                disabled={saving}
                className="w-full h-8 text-xs bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 border-0"
              >
                {saving ? "שומר..." : "הוסף לקוח"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Client List */}
      <div className="flex-1 overflow-y-auto">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-secondary/70 flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">אין לקוחות עדיין.</p>
            <p className="text-xs text-muted-foreground/60">לחץ "חדש" להוספת לקוח ראשון.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {clients.map((c) => (
              <li
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id === selectedId ? null : c.id);
                  setSelectedFile("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className={cn(
                  "px-4 py-3 cursor-pointer transition-all hover:bg-accent/40 flex items-center gap-3",
                  c.id === selectedId && "bg-indigo-50/70 border-s-2 border-s-indigo-600"
                )}
              >
                <ClientAvatar name={c.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>
                </div>
                {c.documents.length > 0 && (
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5 shrink-0 font-medium">
                    {c.documents.length}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected Client Documents + Upload */}
      {selected && (
        <div className="border-t border-border/70 p-4 space-y-3 bg-slate-50/60 flex-shrink-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            מסמכים — {selected.name}
          </p>

          {selected.documents.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">לא הועלו מסמכים.</p>
          ) : (
            <ul className="space-y-1.5">
              {selected.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "shrink-0 rounded-full text-[10px] font-medium",
                      DOC_TYPE_STYLES[d.type] ?? "bg-gray-50 text-gray-600 border-gray-200"
                    )}
                  >
                    {DOC_TYPE_LABELS[d.type] ?? d.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">{d.filename}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 pt-1">
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paystub">תלוש שכר</SelectItem>
                <SelectItem value="bank_statement">דף חשבון</SelectItem>
                <SelectItem value="id_card">תעודת זהות</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 w-full border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-card transition-colors group">
              <FileUp className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-indigo-600 transition-colors shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1">
                {selectedFile || "בחר קובץ PDF..."}
              </span>
              <input
                type="file"
                accept=".pdf"
                ref={fileRef}
                className="sr-only"
                onChange={(e) => setSelectedFile(e.target.files?.[0]?.name ?? "")}
              />
            </label>

            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full h-8 text-xs gap-1.5 bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 border-0 disabled:opacity-40"
            >
              <FileUp className="w-3 h-3" />
              {uploading ? "מעלה..." : "העלה PDF"}
            </Button>
            {uploadError && <p className="text-destructive text-xs">{uploadError}</p>}
          </div>
        </div>
      )}
    </aside>
  );
}
