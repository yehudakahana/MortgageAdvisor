import { LogOut } from "lucide-react";
import Chat from "./components/Chat";
import ClientPanel from "./components/ClientPanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth/AuthContext";
import { ClientsProvider } from "./context/ClientsContext";

export default function App() {
  const { username, logout } = useAuth();
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-gradient-to-l from-indigo-950 via-indigo-900 to-slate-900 text-white px-6 py-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <span className="text-lg font-bold">ש</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">שרה</h1>
              <p className="text-xs text-white/70 mt-1">עוזרת יועץ משכנתאות</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {username && <span className="text-sm text-white/70">{username}</span>}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              התנתקות
            </Button>
          </div>
        </div>
      </header>
      <main className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <ClientsProvider>
          <Chat />
          <ClientPanel />
        </ClientsProvider>
      </main>
    </div>
  );
}
