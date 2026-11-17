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
          <p>Ebooks para transformar conhecimento em ação.</p>
        </div>
      </div>
    </footer>
  )
}
