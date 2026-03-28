## Context

The app uses `AppLayout` as the root shell for all authenticated routes. It renders a fixed left sidebar, a mobile header, and a `<main>` outlet. The `ActivityFeed` component (`src/features/admin/ActivityFeed.tsx`) is a self-contained widget with its own Supabase subscription and state — it can be dropped into any parent without modification.

Shadcn's Drawer is built on `@radix-ui/react-dialog`, which is already installed. The drawer needs to slide in from the right side, overlay the content, and be dismissable without navigating away.

## Goals / Non-Goals

**Goals:**
- Provide a persistent "open feed" trigger in `AppLayout`, visible only to `admin-it`
- Render `ActivityFeed` inside a right-side drawer accessible from any route
- Zero new npm dependencies
- No changes to `ActivityFeed` internals

**Non-Goals:**
- Removing `ActivityFeed` from `DashboardPage` (deferred to a follow-up change)
- Persisting drawer open/closed state across navigation or sessions
- Any mobile-specific bottom-drawer variant

## Decisions

### 1. Use Radix Dialog primitives directly instead of installing the Shadcn CLI drawer component

The Shadcn Drawer (Vaul-based) is a separate package (`vaul`). The simpler approach — and the one that avoids a new dependency — is to use `@radix-ui/react-dialog` directly with a right-side slide-in CSS animation, matching the Shadcn Sheet pattern already used in other Shadcn-based projects. This gives the same UX with no new installs.

**Alternatives considered:**
- Install `vaul` + Shadcn Drawer CLI: Adds a dependency for a UI feature that Radix Dialog already handles cleanly.
- Shadcn Sheet component: Identical to the approach above but would require running the Shadcn CLI to scaffold it first. We implement the same pattern manually to keep it contained in one file.

### 2. Drawer state lives in `AppLayout` — no global store

The trigger and the drawer are both inside `AppLayout`, so local `useState` is sufficient. No context or Zustand slice is needed.

### 3. Single new file: `ActivityFeedDrawer.tsx`

Encapsulate the Radix Dialog + overlay + panel + close button in one component. `AppLayout` imports it and passes an `open`/`onOpenChange` prop pair. This keeps `AppLayout` clean.

### 4. Trigger placement: sidebar bottom section, above user profile

The sidebar already has a bottom section (`border-t p-2`) with profile info and sign-out. Adding an activity icon button there keeps the trigger visible on desktop without cluttering the nav. On mobile, the trigger goes in the top header bar (where the hamburger is).

## Risks / Trade-offs

- **Double subscription**: Opening the drawer while on the dashboard means two `ActivityFeed` instances both subscribe to `activity_feed` Supabase channel. This is low risk (Supabase allows multiple subscribers), but slightly wasteful. → Mitigation: acceptable for now; resolved when the dashboard feed is removed in the follow-up change.
- **Drawer overlays content**: A right-side overlay drawer is modal by default in Radix Dialog, which blocks interaction with the page behind it. → Mitigation: use `modal={false}` on the Dialog root so the drawer is non-modal (user can still click behind it). This matches the UX expectation for a monitoring panel.
