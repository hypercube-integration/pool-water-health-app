# 🏊 Pool Water Health App

A **free-tier Azure** powered pool water monitoring and management app.  
Tracks daily **chlorine** and **pH** readings, recommends chemical actions, and supports **offline-first** usage with powerful export and sharing features.

---

## 🚀 Features

### Core Monitoring
- **Daily chlorine & pH tracking** — manual entry or imported from logs.
- **Salt pool mode logic** — adapts recommendations for salt chlorinator systems.
- **Target range overlays** — visible on charts for quick visual analysis.
- **7-day moving averages** — smooth out short-term fluctuations.

### Dashboard & Charts
- **Interactive dashboard** for real-time or last-synced readings.
- **Multi-line charts** with color coding by metric.
- **Target range shading** for ideal water balance.
- Toggle between **raw** and **averaged** data.

### Data Management
- **Editable log entries** — correct mistakes directly in the app.
- **Export options**:
  - CSV (client-side)
  - Excel `.xlsx` (client-side)
  - CSV (server-side)
- **Chart image export** — share your graphs as `.png` with pool technicians.
- **Copy link** with filters & date range preserved.
- **Offline queue** — add/edit data while offline; sync automatically when back online.

### Pool Equipment Helpers
- Chlorinator % reading helper (XLS Xtra Low Salt control unit).
- Metric explanations for **all settings** in the dashboard.
- **Tiny volume calculator** — quick estimate of added water volumes.

### User & Role Management
- GitHub login via Azure Static Web Apps authentication.
- Role-based permissions (`admin`, `editor`, `viewer`).
- Admin panel for managing users and roles.

### Offline-First Architecture
- Works fully offline — view charts & settings with last-synced data.
- Queued changes auto-sync when connection restores.
- **Reachability-aware**: distinguishes between offline, limited, and online states.
- Optimized API calls to stay within Azure Free Tier limits.

---

## 🛠 Tech Stack
- **Frontend**: React + Vite
- **Auth**: Azure Static Web Apps Auth (GitHub provider)
- **Backend**: Azure Functions (Free Tier)
- **Storage**: Azure Table Storage / Blob Storage (Free Tier)
- **Charts**: [Recharts](https://recharts.org/)
- **Exports**: `xlsx`, custom CSV and image export logic

---

## 📂 Project Structure
```
src/
  components/    # Reusable UI components (charts, forms, helpers)
  hooks/         # Custom hooks (auth, role checks, offline sync)
  pages/         # Page-level components (Dashboard, Admin, Login)
  utils/         # Helper utilities (chemistry logic, export tools)
  assets/        # Icons, images
public/          # Static files (icons, manifest)
```

---

## 📦 Setup

```bash
# Clone the repo
git clone https://github.com/<your-repo>.git
cd pool-water-health-app

# Install dependencies
npm install

# Start local dev server
npm run dev

# Build for production
npm run build
```

---

## 🔒 Roles
| Role    | Permissions |
| ------- | ----------- |
| admin   | Full control over users, settings, data |
| editor  | Add, edit, delete logs; export data |
| viewer  | View dashboard and charts only |

---

## 📤 Export Types
- **Export CSV** — quick download from browser.
- **Export Excel (.xlsx)** — formatted spreadsheet with data & averages.
- **Export CSV (Server)** — server-generated CSV for consistent formatting.
- **Export Chart (.png)** — save visual snapshots.

---

## 📋 License
MIT License
