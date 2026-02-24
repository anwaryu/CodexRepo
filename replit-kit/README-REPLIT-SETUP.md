# Replit Setup Kit (Household Chores Tracker)

This folder contains copy/paste assets you can use to stand up this app in Replit quickly.

## What to upload/copy into a new Replit project

Use a **Node.js Repl** and add these files:

- `server.js`
- `package.json`
- `.gitignore`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/admin.html`
- `public/admin.js`
- `artifacts/HouseholdChoresTracker.ipa` (placeholder; replace for production)
- `replit-kit/.replit.example` (rename to `.replit`)
- `replit-kit/replit-workflow-prompt.md` (assistant prompt)
- `replit-kit/replit-checklist.md` (validation checklist)

---

## Step-by-step deployment instructions

1. Create a new **Node.js** Replit project.
2. Copy the project files above into Replit (or import from GitHub).
3. Rename `replit-kit/.replit.example` to `.replit` in project root.
4. In **Secrets** (left sidebar), add:
   - `JWT_SECRET` = a long random secret
   - `ADMIN_PORTAL_KEY` = a strong admin-only key
5. Run:
   ```bash
   npm install
   npm start
   ```
6. Open the web app URL and verify:
   - `/` loads family app
   - `/admin.html` loads admin portal
7. Log into admin portal and create an invite link for a family.
8. Use the invite link (`/install/<token>`) and verify download URL response.

---

## Replit Agent “vibe coding” prompt

If you want Replit Agent to recreate/extend this app, paste content from:

- `replit-kit/replit-workflow-prompt.md`

Then ask it to execute the checklist from:

- `replit-kit/replit-checklist.md`

---

## Important production notes

- Replace placeholder `artifacts/HouseholdChoresTracker.ipa` with a properly signed iOS artifact.
- Enforce HTTPS and use strong secrets.
- Consider persistent DB (Postgres) instead of file storage for multi-instance deployment.
- Add rate limiting and structured audit logging for admin and install endpoints.
