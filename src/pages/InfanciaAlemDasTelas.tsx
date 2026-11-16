import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { infanciaDraft } from '../content/siteContent'
import { getSalesPageContent } from '../lib/contentApi'

export function InfanciaAlemDasTelas() {
  const [content, setContent] = useState(infanciaDraft)

  useEffect(() => {
    let active = true
    getSalesPageContent()
      .then((savedContent) => {
        if (active) setContent(savedContent)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="sales-page">
      <div className="red-line">✦ {content.redLine} ✦</div>
      <SiteHeader compact />

      <main>
        <section className="sales-hero">
          <div className="sales-hero__copy">
            <p className="section-kicker">{content.eyebrow}</p>
            <h1>{content.title}</h1>
            <p>{content.description}</p>
            <a className="sales-button" href={content.ctaHref}>
              {content.ctaLabel} <span aria-hidden="true">↓</span>
            </a>
            <small>Esta versão não apresenta preço nem promessa comercial.</small>
          </div>
          <div className="book-placeholder" aria-label="Espaço reservado para a capa do ebook">
            <div className="book-placeholder__spine" />
            <div className="book-placeholder__cover">
              <span>CAPA DO EBOOK</span>
              <strong>Infância<br />Além das<br />Telas</strong>
              <small>imagem oficial pendente</small>
            </div>
          </div>
        </section>

        <section className="sales-structure" id="estrutura">
          <div className="sales-structure__heading">
            <p className="section-kicker">{content.status}</p>
            <h2>Uma narrativa pronta para receber o conteúdo.</h2>
            <p>
              A estrutura segue uma sequência de marketing digital, mas toda afirmação, prova e condição comercial
              será preenchida somente com material aprovado.
            </p>
          </div>
          <div className="sales-step-grid">
            {content.sections.map((section) => (
              <article key={section.number}>
                <span>{section.number}</span>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-ready">
          <p className="section-kicker">Próxima entrada</p>
          <h2>Conteúdo, imagens e oferta.</h2>
          <p>
            Assim que os materiais forem recebidos, esta base será convertida na página definitiva, revisada em DEV
            e promovida para produção após aprovação.
          </p>
          <Link className="text-action" to="/">
            Voltar para a HubPages <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
