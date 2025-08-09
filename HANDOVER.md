# 🧳 Handover Pack — Pool Water Health (MVP)

A React + Azure Static Web Apps project for logging and visualizing pool chemistry (pH, chlorine, salt), with Cosmos DB storage, CSV export, and authenticated write actions.

---

## 1) High-Level Architecture

- **UI**: React (Vite), hosted on **Azure Static Web Apps (Free)**
- **APIs (serverless)**: Azure Functions (co-located in SWA `/api`)
- **DB**: Azure Cosmos DB for NoSQL
- **Auth**: SWA built-in (GitHub); identity passed to Functions via `x-ms-client-principal`
- **CI/CD**: GitHub Actions (auto-deploy on push)

```
Browser ──> Static Web App (Edge)
  ├─ serves React app
  ├─ enforces route auth/roles
  └─> /api/* → Functions → Cosmos DB
```

---

## 2) Current Feature Set

- Add, Edit (date is read-only), Delete readings
- View last 30 readings & trend charts with target bands
- CSV export
- Auth required for write/export; public read (optional)
- Role-based UI guards (writer/editor/deleter/exporter/admin)

---

## 3) Repository Structure

```
/api
  /_shared/auth.js            # requireAuth / requireRole helpers
  /submitReading              # POST (writer/admin)
  /getReadings                # GET (public or auth; returns last N)
  /updateReading              # PUT (editor/admin)
  /deleteReading              # DELETE (deleter/admin)
  /exportCSV                  # GET (exporter/admin)
src/
  /pages/Dashboard.jsx        # Main page (forms, charts, history)
  /pages/HistoryList.jsx      # Aligned rows with Edit/Delete actions
  /pages/LogEntryForm.jsx     # Add/Edit form (date read-only in edit)
  /components/AuthStatus.jsx  # Shows signed-in user and links
  /hooks/useAuth.js           # Reads /.auth/me
  /hooks/useRoleCheck.js      # Checks user has any of roles
  styles.css
staticwebapp.config.json      # Route protection
README.md / HANDOVER.md
```

---

## 4) Environment & Settings

### Cosmos (App Settings in SWA → Configuration)
- `COSMOS_CONNECTION_STRING` → Cosmos DB Primary connection string

### Hard-coded in Functions (change if needed)
- Database: `PoolAppDB`
- Container: `Readings`
- Partition key: `/date` (→ **date is read-only during edits**)

---

## 5) Auth & Roles

### Route Protection (staticwebapp.config.json)
```json
{
  "routes": [
    { "route": "/api/submitReading", "allowedRoles": ["writer", "admin"] },
    { "route": "/api/updateReading", "allowedRoles": ["editor", "admin"] },
    { "route": "/api/deleteReading", "allowedRoles": ["deleter", "admin"] },
    { "route": "/api/exportCSV",     "allowedRoles": ["exporter", "admin"] }
    /* Optional:
    ,{ "route": "/api/getReadings",  "allowedRoles": ["authenticated","admin"] }
    */
  ]
}
```

### In-Function Enforcement (`api/_shared/auth.js`)
```js
function getUserFromHeaders(req) {
  const h = req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'];
  if (!h) return null;
  try { return JSON.parse(Buffer.from(h, 'base64').toString('utf8')); } catch { return null; }
}
function requireAuth(context, req) {
  const user = getUserFromHeaders(req);
  if (!user) { context.res = { status: 401, body: { error: 'Not authenticated' } }; return null; }
  return user;
}
function requireRole(context, user, roles) {
  const ok = user?.userRoles?.some(r => roles.includes(r));
  if (!ok) { context.res = { status: 403, body: { error: 'Forbidden: missing role' } }; return false; }
  return true;
}
module.exports = { getUserFromHeaders, requireAuth, requireRole };
```

### Invite a Tester (assign roles)

**Portal**: SWA → Authentication / Users → Invite → provider: GitHub → add roles (comma-separated).  
**CLI**:
```bash
az staticwebapp users invite \
  --name <SWA_NAME> --resource-group <RG> \
  --authentication-provider github \
  --user-details <github-username-or-email> \
  --roles "writer,editor,deleter,exporter"
```

---

## 6) Key Frontend Bits

### `useAuth()` hook (reads `/.auth/me`)
```js
// src/hooks/useAuth.js
import { useEffect, useState } from 'react';
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/.auth/me', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        setUser(data?.clientPrincipal || null);
      } finally { setAuthLoading(false); }
    })();
  }, []);
  return { user, authLoading };
}
```

### `useRoleCheck()` hook
```js
// src/hooks/useRoleCheck.js
import useAuth from './useAuth';
export default function useRoleCheck(required = []) {
  const { user } = useAuth();
  const roles = user?.userRoles || [];
  if (!required.length) return { has: !!user, roles };
  return { has: roles.some(r => required.includes(r)), roles };
}
```

### UI Guards in Dashboard
- Show form only if `writer` or `editor`
- Show buttons based on `editor/deleter/exporter`
- Handle 401/403 in fetch calls, redirect to `/.auth/login/github` as needed

---

## 7) API Function Contracts

### `POST /api/submitReading`  *(writer/admin)*
- Request JSON: `{ date: "YYYY-MM-DD", ph: number, chlorine: number, salt: number }`
- Response: created doc (with `id`)
- Notes: sets `ownerId = user.userId` (optional)

### `PUT /api/updateReading`  *(editor/admin)*
- Request JSON: `{ id: string, date: "YYYY-MM-DD", ph, chlorine, salt }`
- Response: updated doc
- Notes: **date is partition key; cannot change**

### `DELETE /api/deleteReading?id=ID&date=YYYY-MM-DD`  *(deleter/admin)*
- Response: `{ ok: true }`

### `GET /api/getReadings?limit=30`  *(public or auth)*
- Response: `[ { id, date, ph, chlorine, salt, ... } ]` sorted desc

### `GET /api/exportCSV`  *(exporter/admin)*
- Response: `text/csv` attachment

---

## 8) Common Issues & Quick Fixes

- **404 on new Function**: Missing `function.json` or wrong folder name; ensure `/api/<func>/index.js` + `function.json`. Commit & push; check Actions.
- **Build error: “Could not resolve './X'”**: Bad relative import path or case sensitivity (Linux runners are case-sensitive).
- **Edit 404**: Changing `date` (partition key) is not supported → date is read-only in form.
- **401 vs 302**: Remove `responseOverrides` in `staticwebapp.config.json` to get clean 401s for fetch.
- **No `id` in edit**: Ensure `getReadings` returns `id` and form preserves it on submit.
- **Functions not visible**: On SWA Free, the “Functions (Preview)” blade may not appear unless a build deploys valid functions.

---

## 9) Local Dev & Deploy

**Local build:**
```bash
npm install
npm run build
```

**Commit & deploy:**
```bash
git add -A
git commit -m "Feature: <desc>"
git push
# Actions will build and deploy SWA + Functions
```

---

## 10) Next Feature Ideas

- Date range filters for charts and history
- Rolling averages & advisories (basic water care insights)
- PWA offline support
- Owner scoping (`ownerId`) in queries for multi-user separation
- Admin page to view current user/roles, resend invites, etc.

---

## Handy Links

- Sign in: `/.auth/login/github?post_login_redirect_uri=/`
- Sign out: `/.auth/logout?post_logout_redirect_uri=/`
- Who am I: `/.auth/me`

---

**Maintainer note**: This pack is designed to bootstrap a new chat context quickly. Paste it to the assistant to restore an accurate working memory of the project.
