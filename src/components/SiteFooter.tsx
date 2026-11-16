import { Brand } from './Brand'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <Brand />
          <p>Conhecimento que encontra quem precisa dele.</p>
        </div>
        <div className="footer-note">
          <span>HubPages</span>
          <p>Estrutura institucional em desenvolvimento.</p>
        </div>
      </div>
    </footer>
  )
}
