## ADDED Requirements

### Requirement: Drawer trigger visible only to admin-it
The system SHALL render an activity feed trigger button in `AppLayout` exclusively when the authenticated user has the `admin-it` role.

#### Scenario: Trigger hidden for non-admin roles
- **WHEN** a user with role `technician` or `user` is authenticated
- **THEN** the activity feed trigger button is NOT rendered in the sidebar or header

#### Scenario: Trigger visible for admin-it
- **WHEN** a user with role `admin-it` is authenticated
- **THEN** the activity feed trigger button is visible in the sidebar (desktop) and in the header (mobile)

### Requirement: Drawer opens and closes the activity feed panel
The system SHALL open a right-side panel containing the live activity feed when the trigger is activated, and close it when dismissed.

#### Scenario: Open drawer
- **WHEN** the `admin-it` user clicks the activity feed trigger button
- **THEN** a panel slides in from the right side of the screen showing the full `ActivityFeed` component

#### Scenario: Close drawer via close button
- **WHEN** the `admin-it` user clicks the close button inside the drawer
- **THEN** the panel slides out and is no longer visible

#### Scenario: Close drawer by clicking outside
- **WHEN** the drawer is open and the user clicks on the page content behind it
- **THEN** the drawer closes without navigating away

### Requirement: Drawer is non-modal
The system SHALL render the drawer in non-modal mode so the user can interact with the underlying page while the drawer is open.

#### Scenario: Page remains interactive while drawer is open
- **WHEN** the activity feed drawer is open
- **THEN** the user can click links and interact with page content without closing the drawer first

### Requirement: Activity feed inside drawer is live
The system SHALL display the same real-time activity feed inside the drawer as the existing `ActivityFeed` component — with filtering, pagination, and Supabase Realtime subscription.

#### Scenario: New event appears in open drawer
- **WHEN** a new `activity_log` row is inserted while the drawer is open
- **THEN** the event appears at the top of the feed inside the drawer without a page reload

#### Scenario: Filter works inside drawer
- **WHEN** the user selects a category filter chip inside the drawer
- **THEN** only events matching that category are displayed in the drawer feed
