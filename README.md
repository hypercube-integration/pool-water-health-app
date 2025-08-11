# Pool Water Health App

## Overview
The **Pool Water Health App** is a free-tier Azure Static Web App that helps pool owners log daily readings, track trends, and get chemical adjustment recommendations.

## Features
- **Dashboard**
  - pH, chlorine, salt, and temperature trend charts.
  - Target range shading + 7-day moving averages.
  - Colour-coded metrics for easy interpretation.

- **Settings**
  - Pool volume, chemical target ranges, salt pool mode toggle.
  - Consistent styled inputs.

- **Data Export**
  - Export to CSV (local and server-generated).
  - Export to Excel (`.xlsx`).
  - Generate single-page PDF reports with charts.

- **Offline Mode**
  - Works without internet connection.
  - Queue entries offline and sync automatically when online.
  - Maintains login state when going offline.

- **Role-Based Admin UI**
  - Admin dashboard for role and user management.
  - Navigation between Admin and Dashboard.

- **Salt Pool Mode**
  - Adjusted chemical recommendations for saltwater chlorinators.
  - Chlorinator % reading guide in helper section.

## Tech Stack
- **Frontend:** React + Vite
- **Hosting:** Azure Static Web Apps (Free Tier)
- **Auth:** GitHub login via Azure Static Web Apps auth
- **Charts:** Recharts
- **Exports:** `xlsx`, `html2canvas`, `jsPDF`

## Quick Start
```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

## Deployment
This project is set up for CI/CD with Azure Static Web Apps, deploying from the `main` branch.

## License
MIT
