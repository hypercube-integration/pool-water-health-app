# 🏊 Pool Water Health App

A cloud-native React + Azure app to help monitor, track, and optimize swimming pool water quality.

---

## ✅ Features Overview

### Frontend (React + Vite)

- ✅ **Responsive UI with mobile support**  
  _Tech:_ React, CSS Media Queries, `styles.css`

- ✅ **Data Entry Form (pH, Chlorine, Salt, Date)**  
  _Tech:_ React state (`useState`, `useEffect`), controlled inputs

- ✅ **Edit Existing Entry**  
  _Tech:_ Props-based form reuse, conditional submit/cancel buttons

- ✅ **History Log (last 30 entries)**  
  _Tech:_ Array map rendering, sorted entries

- ✅ **Edit Button with Aligned Layout**  
  _Tech:_ Flexbox layout for button alignment

- ✅ **Trend Charts for pH, Chlorine, and Salt**  
  _Tech:_ Recharts (`LineChart`, `ReferenceArea`, `ResponsiveContainer`)

- ✅ **CSV Export of Readings**  
  _Tech:_ Blob + Anchor download, Azure Function (`exportCSV`)

---

### Backend (Azure Functions)

- ✅ **Submit Reading API**  
  _Tech:_ Azure Function, Cosmos DB insert, HTTP POST

- ✅ **Update Reading API**  
  _Tech:_ Azure Function, Cosmos DB replace, HTTP PUT

- ✅ **Fetch Last 30 Readings API**  
  _Tech:_ Azure Function, Cosmos DB query, HTTP GET

- ✅ **Download as CSV API**  
  _Tech:_ Azure Function, stringified CSV, HTTP Response with headers

---

### Data Storage

- ✅ **Cosmos DB (NoSQL)**  
  _Tech:_ Azure Cosmos DB for NoSQL  
  _Use:_ Pool readings stored as JSON docs (partitioned by date)

---

### Deployment & DevOps

- ✅ **Static Frontend Deployment**  
  _Tech:_ Azure Static Web Apps + GitHub Actions CI/CD

- ✅ **Serverless API Deployment**  
  _Tech:_ Azure Functions (integrated with Static Web App)

- ✅ **Environment Variable Configuration**  
  _Tech:_ Azure App Settings (for Cosmos DB keys, database name, etc.)

---

## 🧱 Project Structure

```
src/
├── App.jsx
├── pages/
│   └── Dashboard.jsx
├── components/
│   ├── LogEntryForm.jsx
│   ├── HistoryList.jsx
│   └── TrendChart.jsx
├── styles.css

api/
├── getReadings/
│   └── index.js, function.json
├── submitReading/
│   └── index.js, function.json
├── updateReading/
│   └── index.js, function.json
├── exportCSV/
│   └── index.js, function.json
```

---

## 💸 Tech Stack (Free Tier Only)

| Layer         | Service                   | Tier Used     |
|---------------|----------------------------|---------------|
| Frontend      | Azure Static Web Apps      | Free          |
| Backend APIs  | Azure Functions            | Free          |
| Database      | Azure Cosmos DB for NoSQL  | Free (limited)|
| CI/CD         | GitHub Actions             | Free          |
| Framework     | React (Vite)               | Open Source   |
| Charting      | Recharts                   | Open Source   |

---

## 🚀 Status

This MVP is **live and functional**, supporting all CRUD operations (Create, Read, Update), and will soon support **Delete + Authentication**.

---

## 🔒 Upcoming Features

- [ ] ✅ Delete Entry API + UI  
- [ ] 🔐 API key or login-based authentication  
- [ ] 📱 PWA support for offline use  
- [ ] 📊 Weekly chemical adjustment recommendations  

---

Made with ❤️ and chlorine 🧪
