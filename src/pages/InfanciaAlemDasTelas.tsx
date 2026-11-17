import { useEffect, useRef, useState } from 'react'
import { infanciaDraft } from '../content/siteContent'
import { getSalesPageContent } from '../lib/contentApi'

const bonuses = [
  { image: '/assets/books/100-brincadeiras.webp', number: '01', title: '100 Brincadeiras Fora das Telas', description: '100 propostas organizadas por tempo, ambiente, materiais e faixa etária.', detail: '190 páginas' },
  { image: '/assets/books/calendario-reconexao.webp', number: '02', title: 'Calendário da Reconexão — 30 Dias', description: 'Missões diárias, registros e pequenas atitudes para levar a reconexão à rotina.', detail: '96 páginas' },
  { image: '/assets/books/acordo-familiar.webp', number: '03', title: 'Acordo Familiar de Uso de Telas', description: 'Modelos e ferramentas visuais para regras claras e combinados em família.', detail: '112 páginas' },
  { image: '/assets/books/sos-desligar.webp', number: '04', title: 'SOS! Meu Filho Não Quer Desligar', description: 'Orientações, frases possíveis e estratégias para os momentos de transição.', detail: '128 páginas' },
  { image: '/assets/books/familia-presente.webp', number: '05', title: 'Família Presente', description: 'Hábitos digitais dos adultos, 12 rituais de conexão e ferramentas práticas.', detail: '128 páginas' },
]

const previewPages = [
  { image: '/assets/samples/01-mundo-conectado.webp', source: 'Livro principal', label: 'A infância em um mundo conectado', teaser: 'Uma pergunta essencial: que lugar as telas ocupam na rotina da sua família?' },
  { image: '/assets/samples/02-rotina-familia.webp', source: 'Livro principal', label: 'Conhecendo a rotina da família', teaser: 'Antes de mudar, observe: horários, hábitos e oportunidades começam a aparecer.' },
  { image: '/assets/samples/03-nao-quer-desligar.webp', source: 'Livro principal', label: 'Quando a criança não quer desligar', teaser: 'Um caminho prático para atravessar a resistência sem transformar tudo em confronto.' },
  { image: '/assets/samples/04-caixa-assuntos.webp', source: '100 Brincadeiras Fora das Telas', label: 'A Caixa dos Assuntos Surpresa', teaser: 'Uma brincadeira simples que abre conversas, imaginação e conexão.' },
  { image: '/assets/samples/05-roda-descobertas.webp', source: '100 Brincadeiras Fora das Telas', label: 'A Roda das Pequenas Descobertas', teaser: 'Olhar de novo para o cotidiano pode revelar coisas que passavam despercebidas.' },
  { image: '/assets/samples/06-super-herois-cuidado.webp', source: '100 Brincadeiras Fora das Telas', label: 'Super-Heróis do Cuidado', teaser: 'Transforme pequenos gestos de ajuda em missões que envolvem toda a família.' },
  { image: '/assets/samples/07-oficina-fantoches.webp', source: '100 Brincadeiras Fora das Telas', label: 'Oficina de Fantoches', teaser: 'Papel, imaginação e personagens capazes de contar o que as palavras ainda não contam.' },
  { image: '/assets/samples/08-mascaras-emocoes.webp', source: '100 Brincadeiras Fora das Telas', label: 'Máscaras das Emoções', teaser: 'Uma atividade visual para reconhecer, representar e conversar sobre sentimentos.' },
  { image: '/assets/samples/09-circuito-equilibrio.webp', source: '100 Brincadeiras Fora das Telas', label: 'Circuito do Equilíbrio', teaser: 'Movimento, adaptação e participação: cada criança encontra seu próprio percurso.' },
  { image: '/assets/samples/10-jogo-semaforo.webp', source: '100 Brincadeiras Fora das Telas', label: 'O Jogo do Semáforo', teaser: 'Corpo em movimento e sinais simples para brincar com atenção e autocontrole.' },
  { image: '/assets/samples/11-reflexao-especial.webp', source: 'Calendário da Reconexão', label: 'Dia 10 — Uma Reflexão Especial', teaser: 'Uma pequena missão para criar espaço de conversa durante um momento possível.' },
  { image: '/assets/samples/12-cartoes-emocoes.webp', source: 'Calendário da Reconexão', label: 'Cartões das Emoções', teaser: 'Um recurso ilustrado para a criança identificar e nomear como está se sentindo.' },
]

const methodSteps = [
  ['Observar', 'Entenda uma situação real antes de tentar mudar tudo.'],
  ['Combinar', 'Crie limites claros, previsíveis e adequados à idade.'],
  ['Preparar', 'Organize o ambiente e tenha alternativas ao alcance.'],
  ['Experimentar', 'Coloque uma pequena ação em prática com presença.'],
  ['Revisar', 'Perceba o que ajudou, adapte e continue.'],
]

const manualParts = [
  ['01', 'Compreendendo a infância digital', 'Entenda o contexto das telas e observe o que elas ocupam na rotina.'],
  ['02', 'Conhecendo a sua família', 'Mapeie horários, dificuldades, necessidades e oportunidades de mudança.'],
  ['03', 'Estratégias de reconexão', 'Encontre respostas práticas para situações recorrentes do dia a dia.'],
  ['04', 'Orientações por idade', 'Adapte a abordagem para crianças de 3–5, 6–7 e 8–10 anos.'],
  ['05', 'Método Reconexão', 'Siga 30 experiências familiares com objetivos e registros.'],
  ['06', 'Continuidade e ferramentas', 'Revise combinados e preserve as conquistas depois dos 30 dias.'],
]

const questions = [
  ['Para qual idade o material é indicado?', 'Para pais, mães e responsáveis por crianças de 3 a 10 anos, com orientações e adaptações por faixa etária.'],
  ['Preciso retirar todas as telas da vida do meu filho?', 'Não. A proposta é construir uma relação mais equilibrada com a tecnologia e abrir espaço para brincadeiras, descanso, movimento e convivência.'],
  ['Preciso ler as 300 páginas antes de começar?', 'Não. O manual pode ser lido em sequência ou consultado conforme a necessidade. O plano de 30 dias e as ferramentas são fáceis de localizar.'],
  ['O que recebo nesta oferta?', 'O manual principal e os cinco bônus digitais apresentados nesta página: uma coleção com 954 páginas no total.'],
  ['Os materiais são digitais?', 'Sim. A coleção é entregue em formato digital, com navegação interna e ferramentas para usar em dispositivos compatíveis.'],
  ['Posso adaptar as atividades?', 'Sim. As propostas podem ser ajustadas ao tempo, ao ambiente, aos interesses e aos apoios necessários para cada criança.'],
]

export function InfanciaAlemDasTelas() {
  const [content, setContent] = useState(infanciaDraft)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const previewTouchStart = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    getSalesPageContent().then((saved) => { if (active) setContent(saved) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('sales-page-root')
    return () => document.documentElement.classList.remove('sales-page-root')
  }, [])

  useEffect(() => {
    if (!previewOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false)
      if (event.key === 'ArrowRight') setPreviewIndex((current) => (current + 1) % previewPages.length)
      if (event.key === 'ArrowLeft') setPreviewIndex((current) => (current - 1 + previewPages.length) % previewPages.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [previewOpen])

  const buyButton = (className = 'sales-v2-button') => (
    <a className={className} href={content.ctaHref}>{content.ctaLabel} <span aria-hidden="true">→</span></a>
  )

  const openPreview = () => {
    setPreviewIndex(0)
    setPreviewOpen(true)
  }

  return (
    <div className="sales-v2">
      <div className="red-line">{content.redLine}</div>
      <header className="sales-v2-header">
        <div className="sales-v2-logo"><span>Hub</span><strong>Pages</strong><i /></div>
        {buyButton('sales-v2-header__buy')}
      </header>

      <main>
        <section className="sales-v2-hero">
          <div className="sales-v2-doodle sales-v2-doodle--star" aria-hidden="true">✦</div>
          <div className="sales-v2-hero__copy">
            <p className="sales-v2-kicker">{content.eyebrow}</p>
            <h1>{content.title}</h1>
            <p className="sales-v2-lead">{content.description}</p>
            <div className="sales-v2-price sales-v2-price--hero">
              <span>De <s>R$ 197,00</s> por apenas</span>
              <strong><small>R$</small> 29,90</strong><em>pagamento único</em>
            </div>
            <div className="sales-v2-actions">
              {buyButton()}
              <button className="sales-v2-preview-button" type="button" onClick={openPreview}>Ver uma degustação <span>▻</span></button>
            </div>
            <p className="sales-v2-microcopy">Manual principal + 5 bônus digitais inclusos</p>
          </div>
          <div className="sales-v2-hero__visual">
            <div className="sales-v2-book sales-v2-book--main"><img src="/assets/books/infancia-alem-das-telas.webp" alt="Capa oficial do ebook Infância Além das Telas" /></div>
            <div className="sales-v2-stamp"><strong>6</strong><span>livros<br />digitais</span></div>
            <div className="sales-v2-pages"><strong>954</strong><span>páginas de conteúdo<br />e ferramentas práticas</span></div>
          </div>
        </section>

        <section className="sales-v2-trust" aria-label="Resumo da coleção">
          <span>3 a 10 anos</span><span>Método de 30 dias</span><span>100 brincadeiras</span><span>Acesso digital</span>
        </section>

        <section className="sales-v2-pain">
          <div className="sales-v2-pain__intro"><p className="sales-v2-kicker">Uma cena conhecida por muitas famílias</p><h2>O celular virou a primeira opção de diversão do seu filho?</h2></div>
          <div className="sales-v2-pain__body">
            <p>Desligar a TV, guardar o tablet ou interromper um jogo pode terminar em choro, insistência e discussões. Depois ainda fica a pergunta: <strong>“o que eu ofereço no lugar?”</strong></p>
            <ul><li>Como criar limites sem transformar tudo em briga?</li><li>Como despertar interesse por outras atividades?</li><li>Como construir uma rotina que a família consiga manter?</li><li>Como aproveitar melhor o pouco tempo disponível?</li></ul>
            <blockquote>Seu filho não precisa deixar de gostar de tecnologia. Ele também precisa descobrir quantas coisas interessantes existem além dela.</blockquote>
            {buyButton('sales-v2-button sales-v2-button--inline')}
          </div>
        </section>

        <section className="sales-v2-solution">
          <div className="sales-v2-solution__visual"><img src="/assets/books/infancia-alem-das-telas.webp" alt="Livro digital Infância Além das Telas" /></div>
          <div className="sales-v2-solution__copy">
            <p className="sales-v2-kicker">Conheça a coleção</p>
            <h2>Não é apenas sobre reduzir telas. É sobre recuperar possibilidades.</h2>
            <p>Infância Além das Telas transforma orientação em ação: ajuda você a observar a rotina, estabelecer combinados, atravessar momentos de resistência e oferecer experiências que devolvem espaço à curiosidade, ao movimento e à convivência.</p>
            <div className="sales-v2-benefits"><span>Limites com clareza</span><span>Alternativas por idade</span><span>Ferramentas práticas</span><span>Mais conexão</span></div>
            <div className="sales-v2-actions">{buyButton('sales-v2-button sales-v2-button--dark')}<button className="sales-v2-preview-button sales-v2-preview-button--dark" type="button" onClick={openPreview}>Folhear o ebook</button></div>
          </div>
        </section>

        <section className="sales-v2-method">
          <div className="sales-v2-center-heading"><p className="sales-v2-kicker">Método Reconexão</p><h2>30 dias. Cinco movimentos. Um novo olhar para a rotina.</h2><p>Uma sequência progressiva para começar pelo que cabe hoje e transformar intenção em prática.</p></div>
          <div className="sales-v2-method__grid">{methodSteps.map(([title, description], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
          <div className="sales-v2-section-cta"><p>Comece a reconexão da sua família hoje.</p>{buyButton()}</div>
        </section>

        <section className="sales-v2-tasting">
          <div className="sales-v2-tasting__copy"><p className="sales-v2-kicker">12 páginas reais para explorar</p><h2>Abra a coleção. Descubra ideias que já dão vontade de experimentar.</h2><p>Folheie uma seleção não sequencial do manual, das brincadeiras e do calendário. São páginas ilustradas, atividades práticas e ferramentas que mostram como a coleção transforma orientação em momentos possíveis.</p><button className="sales-v2-preview-button sales-v2-preview-button--large" type="button" onClick={openPreview}>Começar a degustação <span>▻</span></button><small>Use as setas, o teclado ou deslize no celular.</small></div>
          <button className="sales-v2-tasting__book sales-v2-tasting__book--stack" type="button" onClick={openPreview} aria-label="Abrir degustação interativa com 12 páginas"><img src="/assets/samples/07-oficina-fantoches.webp" alt="Página ilustrada Oficina de Fantoches" /><img src="/assets/samples/11-reflexao-especial.webp" alt="Página ilustrada do Calendário da Reconexão" /><img src="/assets/samples/12-cartoes-emocoes.webp" alt="Cartões ilustrados das emoções" /><span>12 páginas · toque para folhear</span></button>
        </section>

        <section className="sales-v2-manual">
          <div className="sales-v2-center-heading"><p className="sales-v2-kicker">Dentro do manual principal</p><h2>300 páginas para entender, agir e continuar.</h2></div>
          <div className="sales-v2-manual__grid">{manualParts.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
          <div className="sales-v2-section-cta sales-v2-section-cta--light"><p>Leve o manual e todos os bônus.</p>{buyButton('sales-v2-button sales-v2-button--dark')}</div>
        </section>

        <section className="sales-v2-bonuses">
          <div className="sales-v2-center-heading"><p className="sales-v2-kicker">A coleção completa</p><h2>E você ainda recebe 5 bônus especiais.</h2><p>Materiais que levam o método para as situações reais da sua casa.</p></div>
          <div className="sales-v2-bonus-grid">{bonuses.map((book) => <article key={book.number}><div className="sales-v2-bonus-cover"><img src={book.image} alt={`Capa oficial de ${book.title}`} /></div><div className="sales-v2-bonus-copy"><span>Bônus especial nº {book.number}</span><h3>{book.title}</h3><p>{book.description}</p><strong>{book.detail} · incluso</strong>{buyButton('sales-v2-mini-buy')}</div></article>)}</div>
        </section>

        <section className="sales-v2-possibilities">
          <p className="sales-v2-kicker">O que começa a caber na rotina</p><h2>Mais ideias para brincar.<br />Mais clareza para combinar.<br /><em>Mais presença para viver.</em></h2>
          <div className="sales-v2-possibilities__grid"><span>Crianças inventando brincadeiras</span><span>Conversas com mais clareza</span><span>Refeições com atenção compartilhada</span><span>Momentos tranquilos antes de dormir</span><span>Projetos criativos em família</span><span>Alternativas para dias corridos</span></div>
          {buyButton('sales-v2-button sales-v2-button--possibilities')}
        </section>

        <section className="sales-v2-offer" id="oferta">
          <div className="sales-v2-offer__books" aria-label="As seis capas da coleção"><img className="offer-main-cover" src="/assets/books/infancia-alem-das-telas.webp" alt="Infância Além das Telas" />{bonuses.map((book) => <img key={book.number} src={book.image} alt={book.title} />)}</div>
          <div className="sales-v2-offer__copy"><p className="sales-v2-kicker">Oferta especial de lançamento</p><h2>Uma biblioteca prática para a sua família.</h2><ul><li>Manual principal com 300 páginas</li><li>Método Reconexão de 30 Dias</li><li>Cinco ebooks complementares</li><li>954 páginas na coleção completa</li><li>Ferramentas, modelos, registros e atividades</li></ul><div className="sales-v2-price"><span>Valor da coleção: <s>R$ 197,00</s></span><strong><small>R$</small> 29,90</strong><em>pagamento único</em></div>{buyButton('sales-v2-button sales-v2-button--offer')}<p className="sales-v2-microcopy">Coleção digital · manual principal + 5 bônus</p></div>
        </section>

        <section className="sales-v2-author" id="autor"><figure className="sales-v2-author__photo"><img src="/assets/author/marioth-nobre.webp" alt="Marioth Nobre, autor da coleção Infância Além das Telas" /><figcaption>Marioth Nobre · Autor</figcaption></figure><div><p className="sales-v2-kicker">Sobre o autor</p><h2>Marioth Nobre</h2><p className="sales-v2-author__lead">Pai de três filhos e autor da coleção Infância Além das Telas.</p><p>Marioth reúne sua experiência como consultor especializado em processos e negócios à vivência cotidiana da paternidade. A coleção nasce desse encontro: organização prática, observação da rotina e o propósito de ajudar outras famílias a equilibrar tecnologia e convivência.</p><small>Editora HubPages · Edição nº 01 · 2026</small></div></section>

        <section className="sales-v2-faq"><div className="sales-v2-center-heading"><p className="sales-v2-kicker">Dúvidas frequentes</p><h2>Antes de começar.</h2></div><div className="sales-v2-faq__list">{questions.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div><div className="sales-v2-section-cta sales-v2-section-cta--light"><p>Pronto para começar?</p>{buyButton('sales-v2-button sales-v2-button--dark')}</div></section>

        <section className="sales-v2-final"><p className="sales-v2-kicker">O melhor momento para criar uma nova memória é o próximo.</p><h2>A infância não espera.<br /><em>Os momentos em família começam agora.</em></h2><p>Comece com uma conversa, uma brincadeira, um combinado ou alguns minutos de atenção compartilhada.</p><div className="sales-v2-price"><span>De <s>R$ 197,00</s> por</span><strong><small>R$</small> 29,90</strong></div>{buyButton('sales-v2-button sales-v2-button--final')}<blockquote>“A infância passa depressa demais para ser vivida através de uma tela.”</blockquote></section>
      </main>

      <footer className="sales-v2-footer"><div className="sales-v2-logo sales-v2-logo--footer"><span>Hub</span><strong>Pages</strong><i /></div><p>Infância Além das Telas · Marioth Nobre · Edição nº 01 · 2026</p></footer>
      <div className="sales-v2-mobile-cta"><div><s>R$ 197,00</s><strong>R$ 29,90</strong></div><a href={content.ctaHref}>{content.ctaLabel}</a></div>

      {previewOpen && <div className="sales-v2-preview" role="dialog" aria-modal="true" aria-label="Degustação interativa da coleção"><button className="sales-v2-preview__backdrop" type="button" onClick={() => setPreviewOpen(false)} aria-label="Fechar degustação" /><div className="sales-v2-preview__panel"><div className="sales-v2-preview__header"><div><span>{previewPages[previewIndex].source} · página {previewIndex + 1} de {previewPages.length}</span><strong>{previewPages[previewIndex].label}</strong></div><button type="button" onClick={() => setPreviewOpen(false)} aria-label="Fechar">×</button></div><div className="sales-v2-preview__progress" aria-hidden="true"><span style={{ width: `${((previewIndex + 1) / previewPages.length) * 100}%` }} /></div><div className="sales-v2-preview__viewer" onTouchStart={(event) => { previewTouchStart.current = event.touches[0]?.clientX ?? null }} onTouchEnd={(event) => { const start = previewTouchStart.current; const end = event.changedTouches[0]?.clientX; previewTouchStart.current = null; if (start == null || end == null || Math.abs(start - end) < 45) return; setPreviewIndex((current) => start > end ? (current + 1) % previewPages.length : (current - 1 + previewPages.length) % previewPages.length) }}><button type="button" onClick={() => setPreviewIndex((previewIndex - 1 + previewPages.length) % previewPages.length)} aria-label="Página anterior">‹</button><figure><img src={previewPages[previewIndex].image} alt={previewPages[previewIndex].label} /><figcaption>{previewPages[previewIndex].teaser}</figcaption></figure><button type="button" onClick={() => setPreviewIndex((previewIndex + 1) % previewPages.length)} aria-label="Próxima página">›</button></div><div className="sales-v2-preview__thumbs" aria-label="Escolher uma página da degustação">{previewPages.map((page, index) => <button className={index === previewIndex ? 'is-active' : ''} type="button" key={page.image} onClick={() => setPreviewIndex(index)} aria-label={`Ver ${page.label}`} aria-current={index === previewIndex ? 'true' : undefined}><img src={page.image} alt="" /><span>{index + 1}</span></button>)}</div><div className="sales-v2-preview__footer"><p><strong>Você viu só 12 páginas.</strong> A coleção completa reúne 954 páginas de orientação, atividades e ferramentas.</p>{buyButton('sales-v2-button sales-v2-button--preview')}</div></div></div>}
    </div>
  )
}
