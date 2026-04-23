# Glossary of User Roles and System Entities

## User Roles

### `client` / `individual`
- **Description**: Standard customer booking one-time or occasional cleaning services
- **Permissions**: Create bookings, view own bookings, update profile, delete own account
- **Dashboard**: None (uses marketing site)

### `business`
- **Description**: Commercial client with ongoing contract
- **Permissions**: View contract, request recurring bookings, manage business profile
- **Dashboard**: Business Dashboard (contract tile, recurring bookings, settings)

### `cleaner`
- **Description**: Cleaning staff assigned to bookings
- **Permissions**: View assigned tasks, update status (idle → on_way → arrived → completed), view earnings
- **Dashboard**: Cleaner Dashboard (tasks, status buttons, earnings, profile)

### `admin`
- **Description**: Operations manager with full system access
- **Permissions**: Manage all users, bookings, cleaners, contracts, payroll, content, audit logs
- **Dashboard**: Admin Dashboard (all entities, assignment tools, reports)

### `digital`
- **Description**: Digital/media department staff
- **Permissions**: Manage content, gallery, promotions
- **Dashboard**: Content management interface

### `transport`
- **Description**: Transport/logistics staff
- **Permissions**: View cleaner locations, manage logistics
- **Dashboard**: Logistics view

## System Entities

### Booking
- A cleaning service request with date, time, location, type, status
- Statuses: `pending` → `assigned` → `on_way` → `arrived` → `completed` | `cancelled`

### Contract
- Business service agreement with rate, duration, type, immutability flag
- Types: `standard`, `premium`, `enterprise`

### Task Completion
- Record of a completed booking linked to a cleaner for payroll calculation
- Used to calculate earnings based on weekday/weekend rates

### Payroll Cycle
- Runs from 28th of previous month to 27th of current month
- Cleaners paid based on task completions within cycle

### Audit Log
- Record of admin actions with admin_id, action, resource_type, resource_id, timestamp, IP
- Immutable history of system changes

### Pending Contract
- New joiner application awaiting approval
- Flow: `pending` → `approved` (becomes employee) / `rejected`

### Session
- Active JWT token record for token invalidation on logout
- 30-day expiry
