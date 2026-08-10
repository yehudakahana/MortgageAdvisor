import { createContext, useContext, useState, ReactNode } from "react";

// Guest-mode UI state: the remaining chat quota (fed by `remainingMessages`
// on chat responses — the single source of truth) and the one-time welcome
// dialog flag.
type GuestModeState = {
  remainingMessages: number | null;
  setRemainingMessages: (n: number) => void;
  welcomeSeen: boolean;
  markWelcomeSeen: () => void;
};

const WELCOME_KEY = "guest_welcome_seen";

// The flag is stored against a fingerprint of the current guest token, not a
// bare "1": a page reload keeps the same token so the dialog stays closed,
// while a new guest account gets a new token and sees the explanation once.
// Storing a fingerprint rather than the token itself keeps the credential in
// one place.
function tokenFingerprint(): string {
  return (localStorage.getItem("user_token") ?? "").slice(-24);
}

const GuestModeContext = createContext<GuestModeState | undefined>(undefined);

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [welcomeSeen, setWelcomeSeen] = useState(() => {
    const fingerprint = tokenFingerprint();
    return !!fingerprint && localStorage.getItem(WELCOME_KEY) === fingerprint;
  });

  function markWelcomeSeen() {
    localStorage.setItem(WELCOME_KEY, tokenFingerprint());
    setWelcomeSeen(true);
  }

  return (
    <GuestModeContext.Provider
      value={{ remainingMessages, setRemainingMessages, welcomeSeen, markWelcomeSeen }}
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
