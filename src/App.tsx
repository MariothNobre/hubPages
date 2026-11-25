import {GoldGuard,GoldSubscriptionPage} from './pages/GoldSubscriptionPage'
import { ContextNotice } from './components/ContextNotice'
import { Route, Routes } from 'react-router-dom'
import { SalesPageRoute } from './components/SalesPageRoute'
import { AdminAccess } from './pages/AdminAccess'
import { SuperAdminPage } from './pages/SuperAdminPage'
import { WorkspaceProfile } from './pages/WorkspaceProfile'
import { TemplatePreviewPage } from './pages/TemplatePreviewPage'
import { StudioPage } from './pages/StudioPage'
import { StudioPreviewPage } from './pages/StudioPreviewPage'
import { PublishedPage } from './pages/PublishedPage'
import { CustomerAccountPage, HomologationTermsPage } from './pages/CustomerAccountPage'

export default function App() {
  return (
    <><ContextNotice/><Routes>
      <Route path="/entrar" element={<AdminAccess publicLogin/>} />
      <Route path="/admin" element={<AdminAccess />} />
      <Route path="/perfil" element={<WorkspaceProfile/>}/>
      <Route path="/studio/modelos/:id" element={<GoldGuard><TemplatePreviewPage/></GoldGuard>}/>
      <Route path="/studio" element={<GoldGuard><StudioPage /></GoldGuard>} />
      <Route path="/studio/assinatura" element={<GoldSubscriptionPage/>}/>
      <Route path="/studio/administracao" element={<SuperAdminPage/>}/>
      <Route path="/studio/preview/:id" element={<GoldGuard><StudioPreviewPage /></GoldGuard>} />
      <Route path="/p/:id" element={<PublishedPage />} />
      <Route path="/conta" element={<CustomerAccountPage />} />
      <Route path="/condicoes-homologacao" element={<HomologationTermsPage />} />
      <Route path="*" element={<SalesPageRoute />} />
    </Routes></>
  )
}

