import { Link } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { hubPagesDraft } from '../content/siteContent'

export function HubPagesHome() {
  const content = hubPagesDraft

  return (
    <div className="site-page">
      <SiteHeader navigation={content.navigation} />

      <main>
        <section className="home-hero" id="sobre">
          <div className="hero-grid" aria-hidden="true" />
          <div className="home-hero__content">
            <p className="section-kicker"><span /> {content.hero.eyebrow}</p>
            <h1>
              {content.hero.title}
              <em>{content.hero.highlight}</em>
            </h1>
            <p className="hero-description">{content.hero.description}</p>
            <div className="hero-actions">
              <Link className="primary-button" to="/infancia_alem_das_telas">
                {content.hero.primaryAction} <span aria-hidden="true">↗</span>
              </Link>
              <a className="secondary-button" href="#como-funciona">
                {content.hero.secondaryAction}
              </a>
            </div>
            <p className="draft-note">Texto provisório · aguardando conteúdo oficial</p>
          </div>

          <div className="editorial-object" aria-hidden="true">
            <div className="editorial-object__halo" />
            <div className="editorial-object__page editorial-object__page--back" />
            <div className="editorial-object__page editorial-object__page--front">
              <span>H</span>
              <small>IDEIAS EM MOVIMENTO</small>
            </div>
            <p>UMA CENTRAL. MUITAS POSSIBILIDADES.</p>
          </div>
        </section>

        <section className="journey" id="como-funciona">
          <div className="section-heading">
            <p className="section-kicker">A jornada HubPages</p>
            <h2>Da descoberta<br />ao próximo passo.</h2>
          </div>
          <div className="pillar-grid">
            {content.pillars.map((pillar) => (
              <article key={pillar.number}>
                <span>{pillar.number}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="first-release" id="ebooks">
          <div className="release-visual" aria-hidden="true">
            <span>EM BREVE</span>
            <strong>01</strong>
          </div>
          <div className="release-content">
            <p className="section-kicker">{content.firstRelease.eyebrow}</p>
            <h2>{content.firstRelease.title}</h2>
            <p>{content.firstRelease.description}</p>
            <Link className="text-action" to="/infancia_alem_das_telas">
              {content.firstRelease.action} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
