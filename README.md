# 🏊 Pool Water Health App (MVP)

This is the **Pool Water Health** MVP web app, built entirely using **free-tier Azure components** and deployed via **Azure Static Web Apps**.  
It lets you track daily **pH, chlorine, and salt** readings, view trends, edit/delete entries, export CSV, and requires sign-in for write operations.

---

## 🚀 Features

✅ Add pool readings (pH, chlorine, salt)  
✅ Edit and delete past readings  
✅ Download CSV of reading history  
✅ Trend charts with green target zones  
✅ Mobile-responsive UI with clean alignment  
✅ Persistent storage via **Azure Cosmos DB (NoSQL)**  
✅ Serverless APIs via **Azure Functions**  
✅ **Secure endpoints** — write/export routes require sign-in  
✅ **Dynamic login banner** — form is hidden when logged out (via `useAuth()`)

---

## 🛠 Tech Stack

| Layer / Feature          | Technology |
|--------------------------|------------|
| Frontend UI              | React (Vite) |
| Styling                  | Custom CSS (responsive) |
| Charts                   | Recharts |
| Hosting + Auth           | Azure Static Web Apps (Free) |
| APIs (serverless)        | Azure Functions (in SWA) |
| Database                 | Azure Cosmos DB for NoSQL |
| CI/CD                    | GitHub Actions |
| CSV Export               | Function-generated CSV |

---

## 📂 Project Structure

\`\`\`
pool-water-health-app/
├── api/                          # Azure Functions
│   ├── submitReading/
│   │   ├── index.js
│   │   └── function.json
│   ├── getReadings/
│   │   ├── index.js
│   │   └── function.json
│   ├── updateReading/
│   │   ├── index.js
│   │   └── function.json
│   ├── deleteReading/
│   │   ├── index.js
│   │   └── function.json
│   └── exportCSV/
│       ├── index.js
│       └── function.json
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── HistoryList.jsx
│   │   └── LogEntryForm.jsx
│   ├── components/
│   │   └── AuthStatus.jsx
│   ├── hooks/
│   │   └── useAuth.js
│   ├── styles.css
│   └── main.jsx
├── staticwebapp.config.json
├── package.json
└── README.md
\`\`\`

---

## 🔐 Authentication & API Security

**Static Web Apps** handles sign-in (e.g., GitHub) and forwards an identity header to Functions.  
We protect routes in `staticwebapp.config.json`, e.g.:

- Protected: `/api/submitReading`, `/api/updateReading`, `/api/deleteReading`, `/api/exportCSV` → **authenticated only**
- Optional: make `/api/getReadings` public or authenticated (your choice)

The UI uses a custom **`useAuth()`** hook to read `/.auth/me`. If logged out, the form is hidden and a sign-in banner is shown. If a session expires mid-action, the client sees **401** and redirects to sign-in.

### 🔎 How `useAuth()` + SWA Auth Works (Mermaid diagram)

\`\`\`mermaid
sequenceDiagram
  autonumber
  participant U as User (Browser)
  participant App as React App (Dashboard.jsx)
  participant Hook as useAuth() Hook
  participant SWA as Azure Static Web Apps
  participant API as Azure Functions (/api/*)
  participant DB as Cosmos DB (NoSQL)

  U->>App: Open site
  App->>Hook: useAuth() mounts
  Hook->>SWA: GET /.auth/me (with cookies)
  alt Logged in
    SWA-->>Hook: 200 { clientPrincipal: {...userId...} }
    Hook-->>App: { user, authLoading:false }
    App-->>U: Show LogEntryForm (Add/Edit), buttons enabled
  else Logged out
    SWA-->>Hook: 200 { clientPrincipal: null } (or empty)
    Hook-->>App: null user
    App-->>U: Hide form, show "Sign in" banner
  end

  U->>App: Submit "Add Reading" (if logged in)
  App->>API: POST /api/submitReading (with auth headers via SWA)
  API->>DB: Insert reading
  DB-->>API: OK
  API-->>App: 200 OK
  App-->>U: Refresh list & charts

  U->>App: Submit "Add Reading" (if logged out)
  App->>SWA: (pre-check) GET /.auth/me
  SWA-->>App: No user
  App-->>U: Prompt sign-in, redirect to /.auth/login/github
\`\`\`

---

## 🗑 Delete Functionality

- Each row in **History** has a 🗑 Delete button.
- The app calls `/api/deleteReading?id=<id>&date=<date>` (Cosmos requires both **id** and **partition key `/date`**).
- **Why is Date read-only during edits?**  
  `date` is the **partition key**. Changing it would require deleting the old doc and creating a new one. To keep things safe and simple, the edit form sets **Date** to read-only.

---

## ⚙️ Environment Variables (Functions)

Set these **App Settings** in your Static Web App (Functions app):

| Key                       | Value (example) |
|---------------------------|-----------------|
| `COSMOS_CONNECTION_STRING`| *Primary connection string from Cosmos DB → Keys* |
| *(hard-coded in code)*    | Database: `PoolAppDB`, Container: `Readings` |

> If you used different names for DB/Container, update them in your function code where the client is created.

---

## 📊 Trend Charts

- Recharts line charts for **pH**, **Chlorine**, and **Salt**  
- Green **ReferenceArea** for target zones  
- Responsive container with fixed height wrapper to prevent clipping  
- Friendly tooltips and axis formatting

---

## 📥 CSV Export

- `GET /api/exportCSV` generates a CSV of all readings
- Requires authentication (protected by route rules)
- Client downloads `pool_readings.csv`

---

## 🚀 Deploy (Summary)

1. Push to **GitHub** (main branch).  
2. **GitHub Actions** builds the Vite app and the Functions.  
3. SWA deploys the site and APIs under `/api/*`.  
4. Auth rules from `staticwebapp.config.json` are enforced at the edge.

---

## 🧪 Testing Scenarios

- ✅ Add/Edit/Delete readings → 200 OK when signed in  
- ✅ Download CSV → 200 OK when signed in  
- ✅ View readings → works when signed in or out (unless you lock it down)  
- 🚫 Try write/export when logged out → client prompts sign-in (401 flow)

---

## 📌 Future Ideas

- Role-based authorization (e.g., admin-only export)  
- PWA (installable, offline cache for by-the-pool use)  
- 7/30-day trend analytics & dosage suggestions  
- Multi-user: tag readings by `ownerId` and filter in queries

---

## 💡 Credits

Built with ❤️ using **React**, **Azure Static Web Apps**, **Azure Functions**, and **Azure Cosmos DB**.
