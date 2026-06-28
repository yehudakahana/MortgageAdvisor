# Responsive Design Progress

Branch: `feat/responsive-design`
Approach: desktop-first, additive `max-md:` / `max-lg:` overrides only. Desktop (≥1024px) must stay pixel-identical.
Breakpoints verified against: 320 / 375 / 768 / 1024+.

## Status legend
- [ ] not started · [~] in progress · [x] done (committed)

## Phase 1 — Audit
- [x] Inventory + audit report produced — awaiting approval

## Phase 2 — Implementation (after approval)
### Shared layout shell (FIRST)
- [x] App.tsx (header + main shell) — h-dvh, mobile padding, hamburger (Users) button, conditional drawer
- [x] index.css (#root dvh)
- [x] ClientPanel.tsx → mobile drawer (variant prop; single mount via useMediaQuery)
- [x] ui/sheet.tsx (new, @radix-ui/react-dialog) + hooks/useMediaQuery.ts (new)

### Pages / features
- [x] Chat.tsx (primary) — mobile padding, wider bubbles (88%), input safe-area pb
- [x] ChatScopeSelect.tsx — reduced gaps/padding, hid redundant label text on mobile, h-11 trigger
- [x] ClientDocuments.tsx — error row wraps, select/label/retry touch targets
- [x] NewClientForm.tsx — inputs/button h-11 + text-base (no iOS zoom)
- [x] ClientPanel.tsx (controls) — search input + new-client button touch/zoom
- [x] LoginForm.tsx — min-h-dvh, inputs/button h-11 + text-base
- [x] ui primitives — applied per-call max-md overrides on every text input instead of editing base (keeps desktop identical); all current inputs covered

## Phase 3 — Verification
- [x] npm run build passes (tsc + vite, 0 errors)
- [x] re-run grep: 6→3 occurrences. All 3 remaining are inside untouched shadcn `ui/select.tsx` (chevron/check positioning) — legitimate. h-screen/min-h-screen/100vh: 3→0.
- [x] desktop regression check: ≥768px renders `<ClientPanel/>` static + Chat exactly as before. All page changes are `max-md:`-only (no desktop effect). App/index.css `h-screen→h-dvh` and `min-h-screen→min-h-dvh` are identical at desktop. ClientPanel static root = same class set, reordered. Pixel-identical.

## Notes / new mechanisms
- `useMediaQuery("(min-width: 768px)")` decides where the single ClientPanel mounts (static aside vs Sheet drawer) to avoid double-mount/double-fetch. Trade-off: resizing across 768px remounts the panel (one extra GET /clients on that resize) — rare, acceptable, not present in normal single-viewport use.
- Sheet has no enter/exit animation (no tailwindcss-animate plugin installed; not added). Drawer is fully functional (overlay, focus trap, esc, close button).
- Dependency added (approved): `@radix-ui/react-dialog` for shadcn Sheet.

## Changelog
- shell: mobile drawer for ClientPanel (shadcn Sheet), h-dvh shell, mobile header. Added dep @radix-ui/react-dialog (approved).
