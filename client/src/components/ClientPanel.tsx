import { useState, useEffect, useRef, Fragment } from "react";
import { getClients, createClient } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, Loader2, Search, UserPlus, Users } from "lucide-react";
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

function formatUploadDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

export default function ClientPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadType, setUploadType] = useState<string>("paystub");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data);
    } catch {
      // silently ignore on initial load
    }
  }

  useEffect(() => { loadClients(); }, []);

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
      setIsCreatingClient(false);
      setName(""); setPhone(""); setEmail("");
    } catch {
      setFormError("יצירת לקוח נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", uploadType);
      const res = await fetch(`/api/upload/${selectedId}`, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const updated: Client = await res.json();
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("העלאה נכשלה. PDF בלבד, מקסימום 10 מגה.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <aside className="w-96 flex-shrink-0 border-s border-border/70 bg-card flex flex-col overflow-hidden shadow-[-4px_0_20px_-4px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/70 bg-gradient-to-b from-slate-50 to-card">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground/70" />
          <h2 className="font-semibold text-sm">לקוחות</h2>
          {clients.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
              {clients.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={isCreatingClient ? "outline" : "default"}
          className={cn(
            "h-8 gap-1 text-xs",
            !isCreatingClient && "bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 shadow-sm border-0"
          )}
          onClick={() => { setIsCreatingClient((v) => !v); setFormError(""); }}
        >
          {isCreatingClient ? (
            "ביטול"
          ) : (
            <>
              <UserPlus className="w-3 h-3" />
              <span>לקוח חדש</span>
            </>
          )}
        </Button>
      </div>

      {/* Search */}
      {clients.length > 0 && (
        <div className="px-3 py-2 border-b border-border/70">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input
              placeholder="חיפוש לקוח..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 ps-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* New Client Form */}
      {isCreatingClient && (
        <Card className="m-3 shadow-sm border-border/60 bg-slate-50/70">
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="client-name" className="text-xs font-medium">שם מלא *</Label>
                <Input id="client-name" placeholder="ישראל ישראלי" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-phone" className="text-xs font-medium">טלפון *</Label>
                <Input id="client-phone" placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-email" className="text-xs font-medium">אימייל</Label>
                <Input id="client-email" placeholder="mail@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
              </div>
              {formError && <p className="text-destructive text-xs">{formError}</p>}
              <Button
                type="submit"
                disabled={saving}
                className="w-full h-9 text-sm bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 border-0"
              >
                {saving ? "שומר..." : "הוסף לקוח"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Client List with inline document accordion */}
      <div className="flex-1 overflow-y-auto">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary/70 flex items-center justify-center">
              <Users className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">אין לקוחות עדיין.</p>
            <p className="text-xs text-muted-foreground/60">לחץ "לקוח חדש" להוספת הלקוח הראשון.</p>
          </div>
        ) : (() => {
          const q = searchQuery.trim().toLowerCase();
          const filtered = q
            ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
            : clients;
          return filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
              <Search className="w-6 h-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">לא נמצאו לקוחות.</p>
            </div>
          ) : (
          <div>
            {filtered.map((c) => (
              <Fragment key={c.id}>
                {/* Client row */}
                <div
                  onClick={() => {
                    setSelectedId(c.id === selectedId ? null : c.id);
                    setUploadError("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className={cn(
                    "px-4 py-3.5 cursor-pointer transition-all hover:bg-accent/40 flex items-center gap-3 border-b border-border/50",
                    c.id === selectedId && "bg-indigo-50/70 border-s-2 border-s-indigo-600"
                  )}
                >
                  <ClientAvatar name={c.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{c.phone}</p>
                  </div>
                  {c.documents.length > 0 && (
                    <span className="text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5 shrink-0 font-medium">
                      {c.documents.length}
                    </span>
                  )}
                </div>

                {/* Inline document accordion */}
                {c.id === selectedId && (
                  <div className="bg-indigo-50/40 border-b border-border/50 border-s-2 border-s-indigo-600 px-4 py-4 space-y-4">
                    {/* Document list */}
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                        מסמכים
                      </p>
                      {c.documents.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60">לא הועלו מסמכים עדיין.</p>
                      ) : (
                        <ul className="space-y-2">
                          {c.documents.map((d) => (
                            <li key={d.id} className="flex items-center gap-2">
                              <Badge
                                className={cn(
                                  "shrink-0 rounded-full text-[11px] font-medium",
                                  DOC_TYPE_STYLES[d.type] ?? "bg-gray-50 text-gray-600 border-gray-200"
                                )}
                              >
                                {DOC_TYPE_LABELS[d.type] ?? d.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate flex-1">{d.filename}</span>
                              <span className="text-[11px] text-muted-foreground/50 shrink-0 tabular-nums">{formatUploadDate(d.uploadedAt)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Upload */}
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">
                        העלאת מסמך
                      </p>
                      <Select value={uploadType} onValueChange={setUploadType}>
                        <SelectTrigger className="w-full h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paystub">תלוש שכר</SelectItem>
                          <SelectItem value="bank_statement">דף חשבון</SelectItem>
                          <SelectItem value="id_card">תעודת זהות</SelectItem>
                          <SelectItem value="other">אחר</SelectItem>
                        </SelectContent>
                      </Select>

                      <label
                        className={cn(
                          "flex items-center gap-2 w-full border border-dashed border-border rounded-lg px-3 py-2.5 cursor-pointer hover:bg-card hover:border-indigo-400 transition-colors group",
                          isUploading && "opacity-60 pointer-events-none"
                        )}
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                        ) : (
                          <FileUp className="w-4 h-4 text-muted-foreground/60 group-hover:text-indigo-600 transition-colors shrink-0" />
                        )}
                        <span className="text-sm text-muted-foreground truncate flex-1">
                          {isUploading ? "מעלה..." : "בחר קובץ PDF להעלאה..."}
                        </span>
                        <input
                          type="file"
                          accept=".pdf"
                          ref={fileInputRef}
                          className="sr-only"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                      </label>

                      {uploadError && <p className="text-destructive text-xs">{uploadError}</p>}
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
          );
        })()}
      </div>
    </aside>
  );
}
