# Replit Validation Checklist

## Environment
- [ ] `JWT_SECRET` secret configured
- [ ] `ADMIN_PORTAL_KEY` secret configured
- [ ] App starts with `npm start`

## Family app checks
- [ ] Register a family account
- [ ] Confirm default chores are present
- [ ] Add a family member
- [ ] Add a custom chore
- [ ] Create schedule with assignment

## Admin portal checks
- [ ] Open `/admin.html`
- [ ] Login with `ADMIN_PORTAL_KEY`
- [ ] Families list loads
- [ ] Create invitation link for a family
- [ ] Open install link and receive download URL

## Private install checks
- [ ] Download works once when `maxInstalls = 1`
- [ ] Second download attempt fails
- [ ] Device appears in admin devices list when `x-device-id` header is sent

## Automated tests
- [ ] Run `npm test` successfully
