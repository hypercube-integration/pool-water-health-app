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
  _Note:_ In this app, `date` is the Cosmos DB **partition key**, so it cannot be changed during edits without deleting and recreating the entry. To prevent accidental loss of data, the date field is **read-only in edit mode**.

- ✅ **Delete Existing Entry**  
  _Tech:_ React event handling, Azure Function (`deleteReading`), Cosmos DB delete using item id + partition key `/date`  
  _Note:_ The delete function requires both the `id` and the original `date` (partition key) to find the record in Cosmos DB.

- ✅ **History Log (last 30 entries)**  
  _Tech:_ Array map rendering, sorted entries, aligned action buttons with Flexbox

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

- ✅ **Delete Reading API**  
  _Tech:_ Azure Function, Cosmos DB delete using item id + partition key `/date`, HTTP DELETE

- ✅ **Fetch Last 30 Readings API**  
  _Tech:_ Azure Function, Cosmos DB query, HTTP GET

- ✅ **Download as CSV API**  
  _Tech:_ Azure Function, stringified CSV, HTTP Response with headers

---

### Data Storage

- ✅ **Cosmos DB (NoSQL)**  
  _Tech:_ Azure Cosmos DB for NoSQL  
  _Use:_ Pool readings stored as JSON docs (partitioned by `/date`)

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
├── deleteReading/
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

This MVP is **live and functional**, supporting all CRUD operations (Create, Read, Update, Delete), and will soon support **Authentication** for API security.

---

## 🔒 Upcoming Features

- [ ] 🔐 API key or login-based authentication  
- [ ] 📱 PWA support for offline use  
- [ ] 📊 Weekly chemical adjustment recommendations  
- [ ] 📅 Date range filtering for readings display  

---

Made with ❤️ and chlorine 🧪
