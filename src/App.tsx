import { Link, Route, Routes } from 'react-router-dom'

function HubPagesHome() {
  return (
    <main className="shell">
      <p className="eyebrow">HubPages</p>
      <h1>Conhecimento que encontra quem precisa dele.</h1>
      <p className="lead">
        A central de ebooks da HubPages está sendo preparada. Esta página é a base técnica inicial e será
        substituída pela experiência comercial definitiva.
      </p>
      <Link className="button" to="/infancia_alem_das_telas">
        Conhecer o primeiro lançamento
      </Link>
    </main>
  )
}

function InfanciaAlemDasTelas() {
  return (
    <main className="shell">
      <p className="eyebrow">Primeiro lançamento</p>
      <h1>Infância Além das Telas</h1>
      <p className="lead">
        Ambiente reservado para a primeira página de vendas da HubPages. A Red Line, a oferta e os CTAs serão
        desenvolvidos na próxima etapa.
      </p>
      <Link className="text-link" to="/">
        Voltar para a HubPages
      </Link>
    </main>
  )
}

function NotFound() {
  return (
    <main className="shell">
      <p className="eyebrow">404</p>
      <h1>Página não encontrada.</h1>
      <Link className="text-link" to="/">
        Ir para o início
      </Link>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubPagesHome />} />
      <Route path="/infancia_alem_das_telas" element={<InfanciaAlemDasTelas />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

