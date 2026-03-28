## Why

The live activity feed is currently locked to the dashboard page, meaning an `admin-it` user loses visibility of real-time events the moment they navigate to issues, devices, or the admin panel. Moving the feed to a persistent right-side drawer—accessible from anywhere in the app—makes it a first-class monitoring tool without requiring a dedicated page.

## What Changes

- Add a Shadcn Drawer (right side panel) wrapping the existing `ActivityFeed` component
- Add an icon button to `AppLayout` (sidebar or header) that opens the drawer, visible only to `admin-it` role
- The drawer slides in from the right and can be dismissed without navigating away
- The existing `ActivityFeed` component on `DashboardPage` remains in place for now (to be removed in a future change once the drawer is validated)

## Capabilities

### New Capabilities

- `activity-feed-drawer`: A globally accessible right-side drawer that renders the live activity feed for `admin-it` users from any page in the app

### Modified Capabilities

- `activity-feed`: The existing feed widget on the dashboard is not removed in this change — no requirement changes, only a new surface is added

## Impact

- **New files**: `src/components/ActivityFeedDrawer.tsx` (drawer wrapper component)
- **Modified files**: `src/components/AppLayout.tsx` — add trigger button and drawer state
- **Dependencies**: `@radix-ui/react-dialog` already installed (used by Shadcn Drawer); no new packages required
- **Roles**: Drawer trigger and content only rendered for `profile.role === 'admin-it'`
- **Reuse**: `ActivityFeed` component at `src/features/admin/ActivityFeed.tsx` is used as-is inside the drawer
