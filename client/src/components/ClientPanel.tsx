import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trash2, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLIENTS_TEXT, COMMON_TEXT } from "@/lib/strings";
import { useClientPanel } from "../hooks/useClientPanel";
import ClientAvatar from "./ClientAvatar";
import NewClientForm from "./NewClientForm";
import ClientDocuments from "./ClientDocuments";
import ConfirmDialog from "./ConfirmDialog";

export default function ClientPanel({ variant = "static" }: { variant?: "static" | "drawer" }) {
  const {
    clients, filteredClients, isLoading, loadError, loadClients, selectedId, selectClient,
    isCreatingClient, setIsCreatingClient,
    name, setName, phone, setPhone, email, setEmail,
    saving, formError, setFormError, handleCreate,
    uploadType, setUploadType, isUploading, uploadError,
    handleFileSelect, fileInputRef,
    handleReExtract, reExtractingId, timedOutDocIds,
    handleDeleteClient, deletingClientId,
    handleDeleteDocument, deletingDocId,
    pendingDelete, deleteConfirmMessage, confirmDelete, cancelDelete, deleteError,
    searchQuery, setSearchQuery,
  } = useClientPanel();

  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden bg-card",
        variant === "drawer"
          ? "h-full w-full"
          : "w-1/2 flex-shrink-0 border-s border-border/70 shadow-[-4px_0_20px_-4px_rgba(0,0,0,0.06)]"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between px-4 py-4 border-b border-border/70 bg-gradient-to-b from-slate-50 to-card", variant === "drawer" && "pe-12")}>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground/70" />
          <h2 className="font-semibold text-base">{CLIENTS_TEXT.title}</h2>
          {clients.length > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
              {clients.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={isCreatingClient ? "outline" : "default"}
          className={cn("h-9 gap-1 text-sm max-md:h-10", !isCreatingClient && "bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 shadow-sm border-0")}
          onClick={() => { setIsCreatingClient((v) => !v); setFormError(""); }}
        >
          {isCreatingClient ? COMMON_TEXT.cancel : <><UserPlus className="w-3 h-3" /><span>{CLIENTS_TEXT.newClient}</span></>}
        </Button>
      </div>

      {/* Search */}
      {clients.length > 0 && (
        <div className="px-3 py-2 border-b border-border/70">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input placeholder={CLIENTS_TEXT.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 max-md:h-11 ps-8 text-base" />
          </div>
        </div>
      )}

      {deleteError && <p className="text-destructive text-sm px-4 py-2 border-b border-border/70">{deleteError}</p>}

      {/* New Client Form */}
      {isCreatingClient && (
        <NewClientForm name={name} setName={setName} phone={phone} setPhone={setPhone} email={email} setEmail={setEmail} saving={saving} formError={formError} onSubmit={handleCreate} />
      )}

      {/* Client List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-base">{CLIENTS_TEXT.loading}</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <p className="text-base text-muted-foreground">{CLIENTS_TEXT.loadFailed}</p>
            <Button size="sm" variant="outline" onClick={() => loadClients()}>
              {COMMON_TEXT.retry}
            </Button>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary/70 flex items-center justify-center">
              <Users className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-base text-muted-foreground">{CLIENTS_TEXT.emptyList}</p>
            <p className="text-sm text-muted-foreground/60">{CLIENTS_TEXT.emptyListHint}</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
            <Search className="w-6 h-6 text-muted-foreground/30" />
            <p className="text-base text-muted-foreground">{CLIENTS_TEXT.noSearchResults}</p>
          </div>
        ) : (
          <div>
            {filteredClients.map((c) => (
              <Fragment key={c.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => selectClient(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectClient(c.id);
                    }
                  }}
                  className={cn("px-4 py-3.5 cursor-pointer transition-all hover:bg-accent/40 flex items-center gap-3 border-b border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", c.id === selectedId && "bg-indigo-50/70 border-s-2 border-s-indigo-600")}
                >
                  <ClientAvatar name={c.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">{c.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.phone}</p>
                  </div>
                  {c.documents.length > 0 && (
                    <span className="text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 shrink-0 font-medium">
                      {c.documents.length}
                    </span>
                  )}
                  <Button
                    size="sm" variant="ghost" aria-label={CLIENTS_TEXT.deleteClient}
                    className="h-8 w-8 p-0 shrink-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                    disabled={deletingClientId === c.id}
                    onClick={(e) => { e.stopPropagation(); handleDeleteClient(c.id); }}
                  >
                    {deletingClientId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
                {c.id === selectedId && (
                  <ClientDocuments
                    clientId={c.id}
                    documents={c.documents}
                    uploadType={uploadType} setUploadType={setUploadType}
                    isUploading={isUploading} uploadError={uploadError}
                    fileInputRef={fileInputRef} onFileSelect={handleFileSelect}
                    onReExtract={handleReExtract} reExtractingId={reExtractingId}
                    timedOutDocIds={timedOutDocIds}
                    onDeleteDocument={handleDeleteDocument} deletingDocId={deletingDocId}
                  />
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={pendingDelete !== null} message={deleteConfirmMessage} onConfirm={confirmDelete} onCancel={cancelDelete} />
    </aside>
  );
}
