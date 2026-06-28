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
- [ ] Chat.tsx (primary)
- [ ] ChatScopeSelect.tsx
- [ ] ClientDocuments.tsx
- [ ] NewClientForm.tsx
- [ ] LoginForm.tsx
- [ ] ui primitives (input/textarea touch targets + 16px font)

## Phase 3 — Verification
- [ ] npm run build passes
- [ ] re-run grep, explain remainders
- [ ] desktop regression check

## Changelog
- shell: mobile drawer for ClientPanel (shadcn Sheet), h-dvh shell, mobile header. Added dep @radix-ui/react-dialog (approved).
