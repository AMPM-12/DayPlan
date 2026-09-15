import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installIosTouchDeadZoneFix } from './utils/iosTouchDeadZoneFix'

installIosTouchDeadZoneFix()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
