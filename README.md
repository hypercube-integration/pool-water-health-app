# 🏊 Pool Water Health App (MVP)

This is the **Pool Water Health** MVP web app, built entirely using **free-tier Azure components** and deployed via **Azure Static Web Apps**.  
It allows users to track **daily chlorine and pH readings**, view trends, edit/delete entries, download CSV logs, and (now) requires sign-in to modify data.

---

## 🚀 Features

✅ **Add pool readings** (chlorine & pH) via a simple form  
✅ **Edit** and **delete** past readings  
✅ **Download CSV** of reading history  
✅ **Trend charts** for chlorine and pH with green target zones  
✅ **Mobile-responsive design** with icons for data points  
✅ **Persistent storage** via **Azure Cosmos DB (NoSQL)**  
✅ **Serverless APIs** with **Azure Functions**  
✅ **Secure API endpoints** — only signed-in users can add, edit, delete, or export data  
✅ **Dynamic login banner** — hides the form when logged out and prompts sign-in  
✅ **Styled UI** with consistent alignment of buttons and labels  

---

## 🛠 Tech Stack

| Feature / Component          | Technology Used                                       |
|------------------------------|-------------------------------------------------------|
| **Frontend** UI              | React (Vite)                                          |
| **Styling**                  | Custom CSS + responsive design 					   |
| **Charts**                   | [Recharts](https://recharts.org/) 					   |
| **API Hosting**              | Azure Static Web Apps Functions 					   |
| **Database**                 | Azure Cosmos DB (NoSQL)  							   |
| **Authentication**           | Azure Static Web Apps built-in auth (GitHub provider) |
| **CSV Generation**           | Serverless function (`exportCSV`) 					   |
| **Version Control**          | GitHub + GitHub Actions CI/CD 						   |
| **Hosting**                  | Azure Static Web Apps (Free Tier) 					   |

---

## 📂 Project Structure

\`\`\`
pool-water-health-app/
├── api/                     # Azure Functions API
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

### How It Works
- **Azure Static Web Apps** handles authentication with providers (e.g., GitHub).  
- The `staticwebapp.config.json` file restricts write endpoints (`submitReading`, `updateReading`, `deleteReading`, `exportCSV`) to authenticated users only.
- When unauthenticated users try to call these APIs directly, the server returns **401 Unauthorized** (no more 302 redirects).
- The frontend checks `/​.auth/me` to detect whether a user is signed in.

### New Behaviour (Post `useAuth()` Update)
- When logged out:
  - The "Add Reading" form is **hidden**.
  - A **yellow banner** appears prompting the user to sign in.
  - Clicking **Sign in with GitHub** redirects to Azure SWA auth flow.
- When logged in:
  - Full form access is available for adding and editing readings.
- If a session expires mid-edit or mid-delete, the UI detects the **401** and redirects to sign-in.

---

## 🗑 Delete Functionality

- Each reading in the **History List** has a red **Delete** button.
- Clicking it prompts confirmation, then calls the `deleteReading` API with both `id` and `date` parameters.
- **Why is `date` read-only on edits?**
  - Because `date` is part of the **Cosmos DB partition key**, changing it would require creating a new record instead of updating in place. This ensures performance and data integrity.

---

## ⚙ Environment Variables (Azure Functions)

Set these in your Azure Function App **Configuration**:

| Name           | Value (example)                                      |
|----------------|------------------------------------------------------|
| COSMOS_DB_CONN | (Primary Connection String from Cosmos DB Keys tab)  |
| COSMOS_DB_NAME | `PoolWaterHealth`                                    |
| COSMOS_COL     | `Readings`                                           |

---

## 📊 Trend Charts

- Uses **Recharts** for pH and Chlorine trend lines.
- Green shaded band indicates target range.
- Y-axis labels aligned to avoid cutoff.
- Responsive design for desktop and mobile.

---

## 📥 CSV Export

- CSV generated by the `exportCSV` Azure Function.
- Requires authentication.
- Triggered by clicking **Download CSV**.
- Browser auto-downloads `pool_readings.csv`.

---

## 🚀 Deployment Steps (Summary)

1. Push code to **GitHub**.
2. Azure Static Web Apps (Free Tier) auto-builds via **GitHub Actions**.
3. APIs deployed under `/api/*` paths.
4. Protected routes defined in `staticwebapp.config.json`.

---

## 📌 Future Roadmap

- [ ] Advanced analytics (e.g., moving averages, chemical dosage suggestions).
- [ ] Role-based permissions (admin vs. read-only users).
- [ ] Offline mode with local cache.
- [ ] Mobile PWA install support.

---

## 🧪 Testing Scenarios

- ✅ Add readings (authenticated)
- ✅ Edit readings (authenticated)
- ✅ Delete readings (authenticated)
- ✅ Download CSV (authenticated)
- ✅ View readings (public)
- 🚫 Attempt add/edit/delete/download when logged out → **Prompt to sign in**

---

## 💡 Credits

Built with ❤️ using **React**, **Azure Static Web Apps**, **Azure Functions**, and **Azure Cosmos DB**.
