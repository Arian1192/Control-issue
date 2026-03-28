## 1. ActivityFeedDrawer Component

- [x] 1.1 Create `src/components/ActivityFeedDrawer.tsx` using `@radix-ui/react-dialog` primitives (Dialog.Root with `modal={false}`, Dialog.Portal, Dialog.Overlay, Dialog.Content)
- [x] 1.2 Style the drawer panel: fixed right-side, full height, ~420px wide, with slide-in-from-right animation using Tailwind `translate-x` + `transition`
- [x] 1.3 Add a close button (X icon) inside the drawer header
- [x] 1.4 Render `<ActivityFeed />` inside the drawer content body

## 2. AppLayout Integration

- [x] 2.1 Import `ActivityFeedDrawer` into `AppLayout.tsx` and add `drawerOpen` state (`useState(false)`)
- [x] 2.2 Add the trigger button in the sidebar bottom section (above user profile), visible only when `profile?.role === 'admin-it'`; use an `Activity` or `Bell` icon from `lucide-react`
- [x] 2.3 Add the same trigger button in the mobile header (`h-14` bar), also gated to `admin-it`
- [x] 2.4 Render `<ActivityFeedDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />` at the bottom of the `AppLayout` return, outside the main layout divs

## 3. Verification

- [x] 3.1 Confirm drawer does not render for `technician` and `user` roles
- [x] 3.2 Confirm drawer opens and closes correctly on desktop and mobile
- [x] 3.3 Confirm real-time events appear in the drawer feed while it is open
- [x] 3.4 Confirm page content remains interactive while drawer is open (non-modal)
- [x] 3.5 Confirm filter chips work inside the drawer
