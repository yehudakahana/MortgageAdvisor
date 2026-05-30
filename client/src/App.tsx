import Chat from "./components/Chat";

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>Sara</h1>
        <p>Mortgage Advisor Assistant</p>
      </header>
      <main>
        <Chat />
      </main>
    </div>
  );
}
