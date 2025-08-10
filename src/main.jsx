// src/main.jsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';

function useHashRoute() {
  const parse = () => {
    const h = window.location.hash || '#/';
    // expect "#/admin" or "#/"
    const path = h.replace(/^#\//, '');
    return path || ''; // '' means dashboard
  };
  const [route, setRoute] = useState(parse());

  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener('hashchange', onHash);
    // support hard loads to "#/admin"
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return route;
}

function App() {
  const route = useHashRoute();

  switch (route) {
    case 'admin':
      return <Admin />;
    case '':
    default:
      return <Dashboard />;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- keep service worker registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
