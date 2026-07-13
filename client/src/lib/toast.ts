// Tiny dependency-free toast store (pub/sub). `toast()` pushes a message; the
// <Toaster /> component subscribes and renders it. Kept minimal on purpose —
// no context threading, no external library.
export type ToastVariant = "error" | "success";
export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

let toasts: Toast[] = [];
const listeners = new Set<(t: Toast[]) => void>();
let nextId = 1;

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function subscribe(listener: (t: Toast[]) => void): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

// Auto-dismisses after 4s. Returns the id so callers can dismiss early.
export function toast(message: string, variant: ToastVariant = "error"): number {
  const id = nextId++;
  toasts = [...toasts, { id, message, variant }];
  emit();
  setTimeout(() => dismissToast(id), 4000);
  return id;
}
