import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Make sure it points to App.tsx!
import './App.css'     // Or your global Tailwind input file

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)