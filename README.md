# Household Chores Tracker

A lightweight app for managing chores at the family level, plus a central admin portal for private iPhone app distribution and device management.

## Features

- User registration/login.
- Family-group scoped data privacy (members, chores, schedules are restricted by `familyId`).
- Default chores seeded for every new family, including estimated durations:
  - Walk the dog (25 min)
  - Clean the dog (10 min)
  - Empty the dishwasher (15 min)
  - Evening Kitchen Clean (5 min)
  - Load dishwasher (10 min)
  - Prepare kids lunches (15 min)
- Add family members.
- Add custom chores with estimated time.
- Create chore schedules and assign chores to family members.
- Central admin portal (`/admin.html`) for:
  - family inventory
  - enrolled iPhone inventory
  - invitation-based private installation link generation

## Private iPhone distribution model

- Admin logs in to `/admin.html` with `ADMIN_PORTAL_KEY`.
- Admin generates an invitation link per family via `/api/admin/invitations`.
- The invitation link (`/install/:token`) is private and time-bound, with install-count limits.
- Installation file download (`/download/:token/HouseholdChoresTracker.ipa`) is allowed only with a valid invitation token.
- Device enrollment is recorded automatically when download requests include `x-device-id` and optional `x-device-name` headers.

> `artifacts/HouseholdChoresTracker.ipa` is a placeholder file in this repository; replace it with your signed iOS build artifact in deployment.

## Replit instructions package

To deploy or recreate this app in Replit using a guided workflow (including prompt files and a checklist), use the files in:

- `replit-kit/README-REPLIT-SETUP.md`
- `replit-kit/replit-workflow-prompt.md`
- `replit-kit/replit-checklist.md`
- `replit-kit/.replit.example`

These are designed to align with Replit's vibe-coding workflow and make setup straightforward.

## Security architecture

- Passwords are never stored in plaintext; PBKDF2 hashing with per-user random salts is used.
- Signed bearer tokens are required for app APIs; tokens are scoped:
  - `scope: family` for household app access
  - `scope: admin` for central portal APIs
- All family data reads/writes are constrained by the authenticated `familyId`.
- Invitation tokens are high-entropy random secrets, with expiry and remaining-install counters.
- Use secure HTTPS, rotate `JWT_SECRET`, and set a strong `ADMIN_PORTAL_KEY` in production.

## Environment variables

- `PORT` (default: `3000`)
- `JWT_SECRET` (default: `dev-secret-change-me`)
- `ADMIN_PORTAL_KEY` (default: `change-admin-key`)

## Run locally

```bash
npm install
npm start
```

Open:
- Family app: `http://localhost:3000/`
- Admin portal: `http://localhost:3000/admin.html`
