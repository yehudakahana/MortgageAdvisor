import Chat from "./components/Chat";
import ClientPanel from "./components/ClientPanel";

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-gradient-to-l from-indigo-950 via-indigo-900 to-slate-900 text-white px-6 py-4 shadow-xl flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="text-lg font-bold">ש</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">שרה</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-white/70">עוזרת יועץ משכנתאות · מחובר</p>
            </div>
          </div>
        </div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <Chat />
        <ClientPanel />
      </main>
    </div>
  );
}
