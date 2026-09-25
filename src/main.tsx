import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/context/AuthContext'
import { KonfirmasiProvider } from '@/context/KonfirmasiContext'
import { LemburProvider } from '@/context/LemburContext'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LemburProvider>
          <KonfirmasiProvider>
            <App />
          </KonfirmasiProvider>
        </LemburProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
