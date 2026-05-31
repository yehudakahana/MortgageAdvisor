import Chat from "./components/Chat";
import ClientPanel from "./components/ClientPanel";

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-6 py-4 shadow-lg flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">שרה</h1>
        <p className="text-sm opacity-60 mt-0.5">עוזרת יועץ משכנתאות</p>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <Chat />
        <ClientPanel />
      </main>
    </div>
  );
}
