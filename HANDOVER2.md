# HANDOVER.md – Pool Water Health App

## Project Overview
The **Pool Water Health App** is a web-based dashboard built using **React + Vite**, hosted on **Azure Static Web Apps** (free tier).  
It allows users to log, track, and visualise pool chemistry readings, with intelligent recommendations, offline support, and export capabilities.

### Stack & Hosting
- **Frontend:** React (Vite)
- **Hosting:** Azure Static Web Apps
- **Authentication:** Azure Static Web Apps Auth (GitHub login, role-based access control)
- **Charts:** Recharts
- **Exports:** CSV, Excel (.xlsx), PDF
- **Offline Support:** Local queue with sync
- **Version Control:** GitHub

## Implemented Features
1. **Core Dashboard**
   - Displays pH, chlorine, salt, temperature trends.
   - Target ranges with shaded background.
   - 7-day moving averages.
   - Chart colours aligned to metric type.

2. **Settings Panel**
   - Pool volume, target ranges, salt pool mode, etc.
   - Styled inputs for consistency across the app.

3. **Data Export**
   - Export CSV (local & server).
   - Export Excel (.xlsx) using `xlsx` package.
   - PDF Report with chart previews (now single-page to avoid split charts).

4. **Offline Mode**
   - Detects connectivity changes.
   - Local queue for offline readings.
   - Auto-sync when back online.
   - Preserves login when going offline.

5. **Role-Based Admin UI**
   - Admin button (only for `admin` role).
   - Admin dashboard for role & user management.
   - Navigation button back to main dashboard.

6. **Salt Pool Mode Logic**
   - Adjusts chemical recommendations for saltwater chlorinators.
   - User helper guide for adjusting chlorinator %.

7. **Chart Improvements**
   - Matching chart colours to target ranges.
   - Visible target ranges on charts.

8. **PDF Report**
   - Report preview modal.
   - Single-page PDF output with all charts fully visible.

## Outstanding / Upcoming Features
- Enhanced user management (role assignment from UI).
- API optimisations to reduce `.auth/me` calls.
- Improved mobile UI responsiveness.

## Technical Notes
- **Auth roles**: Roles must be mapped correctly in Azure Static Web Apps; `.auth/me` reflects active roles.
- **Offline queue**: Uses IndexedDB/localStorage for persistence.
- **PDF generation**: Currently using `html2canvas` + `jsPDF`.

## File Locations
- **Dashboard:** `src/pages/Dashboard.jsx`
- **Settings Panel:** `src/components/SettingsPanel.jsx`
- **Charts:** `src/components/TrendChart.jsx`
- **Exports:** `src/utils/export.js`
- **Report Modal:** `src/components/ReportModal.jsx`

---
End of handover.
