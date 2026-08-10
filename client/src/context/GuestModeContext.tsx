import { createContext, useContext, useState, ReactNode } from "react";

// Guest-mode UI state: the remaining chat quota (fed by `remainingMessages` on
// chat responses — the backend stays the source of truth) and the one-time
// welcome dialog flag.
type GuestModeState = {
  remainingMessages: number | null;
  setRemainingMessages: (n: number) => void;
  welcomeSeen: boolean;
  markWelcomeSeen: () => void;
};

const WELCOME_KEY = "guest_welcome_seen";
const REMAINING_KEY = "guest_remaining_messages";

// Both values are stored against a fingerprint of the current guest token, so
// they follow one account and can never bleed into the next one: a reload keeps
// the same token (dialog stays closed, count stays shown), while a different
// guest account starts clean. A fingerprint rather than the token itself keeps
// the credential in a single place.
function tokenFingerprint(): string {
  return (localStorage.getItem("user_token") ?? "").slice(-24);
}

function readScoped(key: string): string | null {
  const fingerprint = tokenFingerprint();
  if (!fingerprint) return null;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  const [storedFingerprint, value = ""] = stored.split("|");
  return storedFingerprint === fingerprint ? value : null;
}

function writeScoped(key: string, value: string): void {
  localStorage.setItem(key, `${tokenFingerprint()}|${value}`);
}

const GuestModeContext = createContext<GuestModeState | undefined>(undefined);

export function GuestModeProvider({ children }: { children: ReactNode }) {
  // Restored from the last chat reply of a previous page load, so the badge
  // shows a real number immediately instead of waiting for the next message.
  const [remainingMessages, setRemaining] = useState<number | null>(() => {
    const stored = readScoped(REMAINING_KEY);
    return stored === null || stored === "" ? null : Number(stored);
  });
  const [welcomeSeen, setWelcomeSeen] = useState(() => readScoped(WELCOME_KEY) === "1");

  function setRemainingMessages(n: number) {
    writeScoped(REMAINING_KEY, String(n));
    setRemaining(n);
  }

  function markWelcomeSeen() {
    writeScoped(WELCOME_KEY, "1");
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
