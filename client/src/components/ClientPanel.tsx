import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientPanel } from "../hooks/useClientPanel";
import ClientAvatar from "./ClientAvatar";
import NewClientForm from "./NewClientForm";
import ClientDocuments from "./ClientDocuments";

export default function ClientPanel() {
  const {
    clients, filteredClients, isLoading, selectedId, selectClient,
    isCreatingClient, setIsCreatingClient,
    name, setName, phone, setPhone, email, setEmail,
    saving, formError, setFormError, handleCreate,
    uploadType, setUploadType, isUploading, uploadError,
    handleFileSelect, fileInputRef,
    handleReExtract, reExtractingId, timedOutDocIds,
    searchQuery, setSearchQuery,
  } = useClientPanel();

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
          className={cn("h-8 gap-1 text-xs", !isCreatingClient && "bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 shadow-sm border-0")}
          onClick={() => { setIsCreatingClient((v) => !v); setFormError(""); }}
        >
          {isCreatingClient ? "ביטול" : <><UserPlus className="w-3 h-3" /><span>לקוח חדש</span></>}
        </Button>
      </div>

      {/* Search */}
      {clients.length > 0 && (
        <div className="px-3 py-2 border-b border-border/70">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input placeholder="חיפוש לקוח..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 ps-8 text-sm" />
          </div>
        </div>
      )}

      {/* New Client Form */}
      {isCreatingClient && (
        <NewClientForm name={name} setName={setName} phone={phone} setPhone={setPhone} email={email} setEmail={setEmail} saving={saving} formError={formError} onSubmit={handleCreate} />
      )}

      {/* Client List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">טוען לקוחות...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary/70 flex items-center justify-center">
              <Users className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">אין לקוחות עדיין.</p>
            <p className="text-xs text-muted-foreground/60">לחץ "לקוח חדש" להוספת הלקוח הראשון.</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
            <Search className="w-6 h-6 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">לא נמצאו לקוחות.</p>
          </div>
        ) : (
          <div>
            {filteredClients.map((c) => (
              <Fragment key={c.id}>
                <div
                  onClick={() => selectClient(c.id)}
                  className={cn("px-4 py-3.5 cursor-pointer transition-all hover:bg-accent/40 flex items-center gap-3 border-b border-border/50", c.id === selectedId && "bg-indigo-50/70 border-s-2 border-s-indigo-600")}
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
                {c.id === selectedId && (
                  <ClientDocuments
                    documents={c.documents}
                    uploadType={uploadType} setUploadType={setUploadType}
                    isUploading={isUploading} uploadError={uploadError}
                    fileInputRef={fileInputRef} onFileSelect={handleFileSelect}
                    onReExtract={handleReExtract} reExtractingId={reExtractingId}
                    timedOutDocIds={timedOutDocIds}
                  />
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
