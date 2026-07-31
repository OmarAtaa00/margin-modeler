import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { UserProvider } from './contexts/UserContext'
import AuthGate from './components/AuthGate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </UserProvider>
  </StrictMode>,
)