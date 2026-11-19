import { Route, Routes } from 'react-router-dom'
import { HubPagesHome } from './pages/HubPagesHome'
import { SalesPageRoute } from './components/SalesPageRoute'
import { AdminPage } from './pages/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubPagesHome />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<SalesPageRoute />} />
    </Routes>
  )
}

