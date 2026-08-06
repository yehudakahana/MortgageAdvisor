import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getClients } from "../api";
import { stripDeletedDocs } from "@/lib/deletedDocs";
import type { Client } from "../types/client";

// Single source of truth for the clients list, shared by the client panel and
// the chat scope selector so mutations (create/delete/upload) stay in sync.
interface ClientsContextValue {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  isLoading: boolean;
  loadError: boolean;
  loadClients: () => Promise<void>;
}

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const data: Client[] = await getClients();
      // Strip docs deleted this session — a reload racing a deletion must not
      // bring their rows back.
      setClients(data.map((c) => stripDeletedDocs(c)));
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  return (
    <ClientsContext.Provider value={{ clients, setClients, isLoading, loadError, loadClients }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients(): ClientsContextValue {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used within a ClientsProvider");
  return ctx;
}
