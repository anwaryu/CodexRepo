# Prompt for Replit Agent (copy/paste)

Build a Node.js web app called **Household Chores Tracker** with:

1. Family app:
   - User registration/login
   - Family members management
   - Chores list with defaults and estimated minutes
   - Schedule creation and chore assignment

2. Security and tenancy:
   - Password hashing (PBKDF2)
   - Signed bearer tokens
   - All family data scoped by `familyId`

3. Private iPhone distribution:
   - Admin login endpoint using `ADMIN_PORTAL_KEY`
   - Admin can generate invitation-based install links
   - Invitation has expiry + max installs
   - Download endpoint for `.ipa` only works with valid invite token
   - Device enrollment capture from headers (`x-device-id`, `x-device-name`)

4. Admin portal UI:
   - Login page
   - Families list
   - Devices list
   - Invite generator form

5. Files to produce:
   - `server.js`
   - `package.json`
   - `public/index.html`, `public/app.js`, `public/styles.css`
   - `public/admin.html`, `public/admin.js`
   - `test/app.test.js`
   - `README.md`

6. Tests:
   - Add an end-to-end test covering family flows, admin login, invite creation, private download, and device registration.

After coding, run tests and provide exact commands + results.
