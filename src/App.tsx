import { Route, Routes } from 'react-router-dom'
import { SalesPageRoute } from './components/SalesPageRoute'
import { AdminPage } from './pages/AdminPage'
import { StudioPage } from './pages/StudioPage'

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="*" element={<SalesPageRoute />} />
    </Routes>
  )
}

