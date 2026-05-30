import Chat from "./components/Chat";
import ClientPanel from "./components/ClientPanel";

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>Sara</h1>
        <p>Mortgage Advisor Assistant</p>
      </header>
      <main>
        <Chat />
        <ClientPanel />
      </main>
    </div>
  );
}
