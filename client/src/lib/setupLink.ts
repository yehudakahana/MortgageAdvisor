// Reads an invite / reset token from the URL fragment (#setup=<token>) once,
// at module load, and immediately removes it from the address bar so it does
// not linger in history, screenshots or a copied URL. Module load (not a React
// initializer) because StrictMode may run initializers twice.
function takeSetupToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/^#setup=([A-Za-z0-9_-]{20,100})$/);
  if (!match) return null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return match[1];
}

let setupToken = takeSetupToken();

export function getSetupToken(): string | null {
  return setupToken;
}

export function clearSetupToken(): void {
  setupToken = null;
}
