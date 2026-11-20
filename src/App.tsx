import { Route, Routes } from 'react-router-dom'
import { SalesPageRoute } from './components/SalesPageRoute'
import { AdminPage } from './pages/AdminPage'
import { StudioPage } from './pages/StudioPage'
import { StudioPreviewPage } from './pages/StudioPreviewPage'
import { PublishedPage } from './pages/PublishedPage'
import { CustomerAccountPage, HomologationTermsPage } from './pages/CustomerAccountPage'

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="/studio/preview/:id" element={<StudioPreviewPage />} />
      <Route path="/p/:id" element={<PublishedPage />} />
      <Route path="/conta" element={<CustomerAccountPage />} />
      <Route path="/condicoes-homologacao" element={<HomologationTermsPage />} />
      <Route path="*" element={<SalesPageRoute />} />
    </Routes>
  )
}

