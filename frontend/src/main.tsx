import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import App from './App'
import { configuredService } from './services/dining'
import './styles.css'

const service = configuredService()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App service={service} />
    </HashRouter>
  </StrictMode>,
)
