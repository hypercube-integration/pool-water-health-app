# Pool Water Health App

A responsive, Azure-hosted dashboard for tracking and maintaining your pool's chemical balance.  
Built with **React**, **Vite**, and **Azure Static Web Apps** (free tier), with serverless APIs for secure data operations.

---

## 🚀 Features

### 1. **Authentication & Roles**
- Integrated with **Azure Static Web Apps Authentication** (`/.auth/me`).
- Role-based UI controls:
  - **Reader**: View dashboard & charts.
  - **Writer / Editor / Admin**: Add, edit, delete, and export logs.

### 2. **Data Management**
- Add new readings via `LogEntryForm`.
- Edit or delete existing readings directly from the **History List**.
- Data stored and retrieved via Azure serverless APIs.
- API responses returned as JSON; data validated and type-coerced for charts.

### 3. **Date Range Filters**
- Filter readings by selecting **Start Date** / **End Date**.
- Common presets: *Last 7 days*, *Last 30 days*, *Last 90 days*, or *Custom*.
- Automatically refreshes dashboard data when range changes.

### 4. **Charts**
- Built with **Recharts** and fully responsive:
  - pH
  - Chlorine (ppm)
  - Salt (ppm)
- **Target range shaded bands** for each parameter:
  - pH: Orange band
  - Chlorine: Green band
  - Salt: Blue band
- **7-day moving average** overlays (toggleable).
- Sorts data ascending for left-to-right time flow.
- Auto-resizes on **mobile orientation change**.

### 5. **Water Care Advisories (NEW)**
- Calculates advisories based on the **latest reading** in the selected date range.
- Detects out-of-range pH, chlorine, and salt levels.
- Severity indicators:
  - ✅ *All Good*
  - ℹ️ *Info*
  - ⚠️ *Attention Needed*
  - ❗ *Action Required*
- Offers practical suggestions (e.g., “Add salt gradually and re-test”).

### 6. **Responsive Design**
- Works seamlessly on desktop, tablet, and mobile browsers.
- Charts expand to full width in landscape mode.
- Mobile-friendly date pickers and buttons.

---

## 📂 Project Structure

```
src/
  components/
    AdvisoriesPanel.jsx     # Displays current advisories based on latest reading
    AuthStatus.jsx          # Shows logged-in user and logout link
    DateRangeControls.jsx   # Date range & preset selector
    HistoryList.jsx         # Table of historical readings (editable)
    LogEntryForm.jsx        # Form to add or edit a reading
    TrendChart.jsx          # Charts for pH, chlorine, salt
  hooks/
    useAuth.js              # Gets auth status from /.auth/me
    useRoleCheck.js         # Checks if user has any of given roles
  pages/
    Dashboard.jsx           # Main dashboard page
  utils/
    chemistry.js            # Target ranges, advisory logic, moving averages
styles.css                  # Global styles & dashboard layout
```

---

## 🔧 Local Development

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd pool-water-health-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```
   App will be available at `http://localhost:5173/`

---

## ☁️ Deployment to Azure Static Web Apps

1. Push your code to GitHub.
2. In Azure Portal:
   - Create a **Static Web App (Free)**.
   - Connect to your GitHub repo.
   - Set build presets: **Vite** → `dist` as output folder.
3. APIs are deployed automatically from `/api`.

---

## 🔐 Authentication Notes

- Use the full URL for `.auth/me` to verify login:
  ```
  https://<your-site>.azurestaticapps.net/.auth/me
  ```
- To reset stale mobile credentials:
  - Visit `/logout` then `/login/github` (or other provider).

---

## 🧪 Testing Checklist

- [x] Log in as **Reader** → verify read-only dashboard.
- [x] Log in as **Writer** → verify add/edit/delete functions.
- [x] Change date range → verify filtered data & advisories update.
- [x] Toggle 7-day averages → verify line overlay appears/disappears.
- [x] Mobile rotation → charts resize without breaking layout.
- [x] Target bands visible on all charts (including Salt green band).
- [x] Advisories reflect latest reading.

---

## 📜 License

MIT
