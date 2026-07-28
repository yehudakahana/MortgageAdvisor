import { useState } from "react";
import { LogOut, Settings, Users } from "lucide-react";
import Chat from "./components/Chat";
import ClientPanel from "./components/ClientPanel";
import SettingsSheet from "./components/SettingsSheet";
import Toaster from "./components/Toaster";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { APP_TEXT, CLIENTS_TEXT, SETTINGS_TEXT } from "@/lib/strings";
import { useAuth } from "./auth/AuthContext";
import { ClientsProvider } from "./context/ClientsContext";
import { useMediaQuery } from "./hooks/useMediaQuery";

export default function App() {
  const { username, logout } = useAuth();
  // Render the (data-fetching) ClientPanel in exactly one place: a static aside
  // on desktop, or a drawer on mobile. Never both, to avoid a double mount.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col h-dvh bg-background">
      <header className="bg-gradient-to-l from-indigo-950 via-indigo-900 to-slate-900 text-white px-6 py-4 max-md:px-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <span className="text-lg font-bold">{APP_TEXT.initial}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">{APP_TEXT.title}</h1>
              <p className="text-xs text-white/70 mt-1 max-md:text-[11px]">{APP_TEXT.tagline}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label={SETTINGS_TEXT.openSettings}
              title={SETTINGS_TEXT.openSettings}
              className="ms-2 h-10 w-10 rounded-xl bg-white/15 border border-white/25 text-white shadow-inner hover:bg-white/25 hover:text-white max-md:min-h-11 max-md:min-w-11"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-3 max-md:gap-1.5">
            {username && <span className="text-sm text-white/70 max-md:hidden">{username}</span>}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5 max-md:min-h-11 max-md:px-2.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="max-md:hidden">{APP_TEXT.logout}</span>
            </Button>
            {!isDesktop && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPanelOpen(true)}
                aria-label={APP_TEXT.openClientsPanel}
                className="text-white/80 hover:text-white hover:bg-white/10 min-h-11 min-w-11"
              >
                <Users className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <ClientsProvider>
          <Chat />
          {isDesktop ? (
            <ClientPanel />
          ) : (
            <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
              <SheetContent side="end" className="w-80 p-0">
                <SheetTitle className="sr-only">{CLIENTS_TEXT.title}</SheetTitle>
                <ClientPanel variant="drawer" />
              </SheetContent>
            </Sheet>
          )}
        </ClientsProvider>
      </main>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Toaster />
    </div>
  );
}
