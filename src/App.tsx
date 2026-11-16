import { Route, Routes } from 'react-router-dom'
import { HubPagesHome } from './pages/HubPagesHome'
import { InfanciaAlemDasTelas } from './pages/InfanciaAlemDasTelas'
import { NotFound } from './pages/NotFound'
import { AdminPage } from './pages/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubPagesHome />} />
      <Route path="/infancia_alem_das_telas" element={<InfanciaAlemDasTelas />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

