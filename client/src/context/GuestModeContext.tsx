import { createContext, useContext, useState, ReactNode } from "react";

// Guest-mode UI state: the remaining chat quota (fed by `remainingMessages`
// on chat responses — the single source of truth) and the one-time welcome
// dialog flag. Deliberately in-memory only (per session, not localStorage).
type GuestModeState = {
  remainingMessages: number | null;
  setRemainingMessages: (n: number) => void;
  welcomeSeen: boolean;
  markWelcomeSeen: () => void;
};

const GuestModeContext = createContext<GuestModeState | undefined>(undefined);

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [welcomeSeen, setWelcomeSeen] = useState(false);

  return (
    <GuestModeContext.Provider
      value={{
        remainingMessages,
        setRemainingMessages,
        welcomeSeen,
        markWelcomeSeen: () => setWelcomeSeen(true),
      }}
    >
      {children}
    </GuestModeContext.Provider>
  );
}

export function useGuestMode() {
  const ctx = useContext(GuestModeContext);
  if (!ctx) throw new Error("useGuestMode must be used within GuestModeProvider");
  return ctx;
}
