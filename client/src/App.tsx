import Chat from "./components/Chat";
import ClientPanel from "./components/ClientPanel";

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>שרה</h1>
        <p>עוזרת יועץ משכנתאות</p>
      </header>
      <main>
        <Chat />
        <ClientPanel />
      </main>
    </div>
  );
}
