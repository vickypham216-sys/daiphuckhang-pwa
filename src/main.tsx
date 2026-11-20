import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import BanMoi from './BanMoi.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BanMoi />
    <App />
  </StrictMode>,
)
