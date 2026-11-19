import { useEffect, useRef, useState } from 'react'
import { AnalyticsTracker } from '../components/AnalyticsTracker'
import { MetaPixel } from '../components/MetaPixel'
import { infanciaEsDraft } from '../content/siteContent'
import { getSalesPageContent } from '../lib/contentApi'

const pageSlug = 'infancia_alem_das_telas_es' as const
const mainCover = '/assets/es/books/infancia-mas-alla-de-las-pantallas.png'

const bonuses = [
  { image: '/assets/es/books/100-juegos.png', number: '01', title: '100 Juegos Fuera de las Pantallas', description: '100 propuestas organizadas por tiempo, espacio, materiales y edad.', detail: '190 páginas' },
  { image: '/assets/es/books/calendario-reconexion.png', number: '02', title: 'Calendario de la Reconexión — 30 Días', description: 'Misiones diarias, registros y pequeñas acciones para llevar la reconexión a la rutina.', detail: '96 páginas' },
  { image: '/assets/es/books/acuerdo-familiar.png', number: '03', title: 'Acuerdo Familiar para el Uso de Pantallas', description: 'Modelos y herramientas visuales para crear reglas claras y acuerdos familiares.', detail: '112 páginas' },
  { image: '/assets/es/books/sos-apagar.png', number: '04', title: '¡SOS! Mi Hijo No Quiere Apagar la Pantalla', description: 'Orientaciones, frases útiles y estrategias para los momentos de transición.', detail: '128 páginas' },
  { image: '/assets/es/books/familia-presente.png', number: '05', title: 'Familia Presente', description: 'Hábitos digitales de los adultos, 12 rituales de conexión y herramientas prácticas.', detail: '128 páginas' },
]

const previewPages = [
  { image: '/assets/es/samples/01-mundo-conectado.jpg', source: 'Manual principal', label: 'La infancia en un mundo conectado', kicker: 'Comprender antes de cambiar', body: 'Observa qué lugar ocupan las pantallas en la rutina familiar y distingue los usos necesarios del entretenimiento automático.' },
  { image: '/assets/es/samples/02-rutina-familiar.jpg', source: 'Manual principal', label: 'Conociendo la rutina familiar', kicker: 'Un diagnóstico cotidiano', body: 'Registra horarios, hábitos y momentos sensibles para encontrar una oportunidad concreta de cambio.' },
  { image: '/assets/es/samples/03-transicion-pantalla.jpg', source: 'Manual principal', label: 'Cuando el niño no quiere apagar', kicker: 'Transiciones con firmeza y calma', body: 'Acércate, reconoce el deseo de continuar y muestra con claridad cuál es el siguiente paso.' },
  { image: '/assets/es/samples/04-caja-sorpresa.jpg', source: '100 Juegos Fuera de las Pantallas', label: 'La Caja de Temas Sorpresa', kicker: 'Juego n.º 001', body: 'Una figura abre una conversación y despierta recuerdos e imaginación sin obligar a nadie a contar algo personal.' },
  { image: '/assets/es/samples/05-rueda-descubrimientos.jpg', source: '100 Juegos Fuera de las Pantallas', label: 'La Rueda de los Pequeños Descubrimientos', kicker: 'Juego n.º 010', body: 'Cada persona comparte algo que observó y el grupo descubre nuevas maneras de mirar lo cotidiano.' },
  { image: '/assets/es/samples/06-superheroes-cuidado.jpg', source: '100 Juegos Fuera de las Pantallas', label: 'Superhéroes del Cuidado', kicker: 'Juego n.º 017', body: 'Convierte pequeños gestos de ayuda en misiones de cuidado, cooperación y escucha.' },
  { image: '/assets/es/samples/07-titeres.jpg', source: '100 Juegos Fuera de las Pantallas', label: 'Taller de Títeres', kicker: 'Creatividad en familia', body: 'Papel, personajes e imaginación para representar historias y expresar lo que a veces cuesta decir.' },
  { image: '/assets/es/samples/08-mascaras-emociones.jpg', source: '100 Juegos Fuera de las Pantallas', label: 'Máscaras de las Emociones', kicker: 'Reconocer y conversar', body: 'Una actividad visual para identificar sentimientos, representarlos y hablar de ellos con naturalidad.' },
  { image: '/assets/es/samples/09-circuito-equilibrio.jpg', source: '100 Juegos Fuera de las Pantallas', label: 'Circuito del Equilibrio', kicker: 'Cuerpo en movimiento', body: 'Crea un recorrido adaptable en el que cada niño pueda participar a su ritmo y celebrar sus avances.' },
  { image: '/assets/es/samples/10-juego-semaforo.jpg', source: '100 Juegos Fuera de las Pantallas', label: 'El Juego del Semáforo', kicker: 'Atención y autocontrol', body: 'Señales simples, movimiento y diversión para practicar la pausa, la atención y la respuesta consciente.' },
  { image: '/assets/es/samples/11-reflexion.jpg', source: 'Calendario de la Reconexión', label: 'Día 10 — Una Reflexión Especial', kicker: 'Una misión posible', body: 'Reserva un momento breve para escuchar, conversar y reconocer algo valioso que ocurrió durante el día.' },
  { image: '/assets/es/samples/12-tarjetas-emociones.jpg', source: 'Calendario de la Reconexión', label: 'Tarjetas de las Emociones', kicker: 'Nombrar lo que sentimos', body: 'Un recurso ilustrado para que el niño identifique su emoción y encuentre palabras para compartirla.' },
].map((page) => ({ ...page, position: 'center' }))

const methodSteps = [
  ['Observar', 'Comprende una situación real antes de intentar cambiarlo todo.'],
  ['Acordar', 'Crea límites claros, previsibles y adecuados para la edad.'],
  ['Preparar', 'Organiza el ambiente y deja alternativas al alcance.'],
  ['Experimentar', 'Pon en práctica una pequeña acción con presencia.'],
  ['Revisar', 'Reconoce lo que funcionó, ajusta y continúa.'],
]

const manualParts = [
  ['01', 'Comprender la infancia digital', 'Entiende el contexto de las pantallas y observa qué espacio ocupan en la rutina.'],
  ['02', 'Conocer a tu familia', 'Identifica horarios, dificultades, necesidades y oportunidades de cambio.'],
  ['03', 'Estrategias de reconexión', 'Encuentra respuestas prácticas para situaciones frecuentes del día a día.'],
  ['04', 'Orientaciones por edad', 'Adapta el enfoque para niños de 3–5, 6–7 y 8–10 años.'],
  ['05', 'Método Reconexión', 'Sigue 30 experiencias familiares con objetivos y registros.'],
  ['06', 'Continuidad y herramientas', 'Revisa los acuerdos y conserva los avances después de los 30 días.'],
]

const questions = [
  ['¿Para qué edades está indicado?', 'Para madres, padres y responsables de niños de 3 a 10 años, con orientaciones y adaptaciones por edad.'],
  ['¿Tengo que eliminar todas las pantallas?', 'No. La propuesta es construir una relación más equilibrada con la tecnología y recuperar espacio para jugar, descansar, moverse y convivir.'],
  ['¿Necesito leer las 300 páginas antes de empezar?', 'No. Puedes leer el manual en orden o consultarlo según tu necesidad. El plan de 30 días y las herramientas son fáciles de localizar.'],
  ['¿Qué recibo con esta oferta?', 'El manual principal y los cinco bonos digitales presentados aquí: una colección de 954 páginas en total.'],
  ['¿Los materiales son digitales?', 'Sí. La colección se entrega en formato digital, con navegación interna y herramientas para dispositivos compatibles.'],
  ['¿Puedo adaptar las actividades?', 'Sí. Las propuestas se ajustan al tiempo, el espacio, los intereses y los apoyos que cada niño necesite.'],
]

export function InfanciaAlemDasTelasEs() {
  const [content, setContent] = useState(infanciaEsDraft)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const previewTouchStart = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    getSalesPageContent(pageSlug)
      .then((saved) => { if (active) setContent({ ...infanciaEsDraft, ...saved, redLine: saved.redLine.includes('R$ 197,00') ? infanciaEsDraft.redLine : saved.redLine }) })
      .catch(async () => {
        const portuguese = await getSalesPageContent('infancia_alem_das_telas').catch(() => null)
        if (active && portuguese) setContent((current) => ({ ...current, metaPixelId: portuguese.metaPixelId, metaPixelEnabled: portuguese.metaPixelEnabled }))
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('sales-page-root')
    document.documentElement.lang = 'es'
    return () => { document.documentElement.classList.remove('sales-page-root'); document.documentElement.lang = 'pt-BR' }
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

  const buyButton = (className = 'sales-v2-button') => <a className={className} href={content.ctaHref}>{content.ctaLabel}</a>
  const openPreview = () => { setPreviewIndex(0); setPreviewOpen(true) }
  const page = previewPages[previewIndex]

  return (
    <div className="sales-v2 sales-v2--es">
      <div className="red-line">{content.redLine}</div>
      <header className="sales-v2-header"><div className="sales-v2-logo"><span>Hub</span><strong>Pages</strong><i /></div>{buyButton('sales-v2-header__buy')}</header>
      <main>
        <section className="sales-v2-hero">
          <div className="sales-v2-doodle sales-v2-doodle--star" aria-hidden="true">✦</div>
          <div className="sales-v2-hero__copy"><p className="sales-v2-kicker">{content.eyebrow}</p><h1>{content.title}</h1><p className="sales-v2-lead">{content.description}</p><div className="sales-v2-price sales-v2-price--hero"><span>Oferta internacional por solo</span><strong><small>US$</small> 6.90</strong><em>pago único</em></div><div className="sales-v2-actions">{buyButton()}<button className="sales-v2-preview-button" type="button" onClick={openPreview}>Ver una muestra</button></div><p className="sales-v2-microcopy">Manual principal + 5 bonos digitales incluidos</p></div>
          <div className="sales-v2-hero__visual"><div className="sales-v2-book sales-v2-book--main"><img src={mainCover} alt="Portada oficial de Infancia Más Allá de las Pantallas" /></div><div className="sales-v2-stamp"><strong>6</strong><span>libros<br />digitales</span></div><div className="sales-v2-pages"><strong>954</strong><span>páginas de contenido<br />y herramientas prácticas</span></div></div>
        </section>
        <section className="sales-v2-trust" aria-label="Resumen de la colección"><span>3 a 10 años</span><span>Método de 30 días</span><span>100 juegos</span><span>Acceso digital</span></section>
        <section className="sales-v2-pain"><div className="sales-v2-pain__intro"><p className="sales-v2-kicker">Una escena conocida por muchas familias</p><h2>¿El celular se convirtió en la primera opción de diversión de tu hijo?</h2></div><div className="sales-v2-pain__body"><p>Apagar la televisión, guardar la tableta o interrumpir un juego puede acabar en llanto, insistencia y discusiones. Y después queda la pregunta: <strong>“¿qué le ofrezco en su lugar?”</strong></p><ul><li>¿Cómo poner límites sin convertir todo en una pelea?</li><li>¿Cómo despertar interés por otras actividades?</li><li>¿Cómo construir una rutina que la familia pueda mantener?</li><li>¿Cómo aprovechar mejor el poco tiempo disponible?</li></ul><blockquote>Tu hijo no tiene que dejar de disfrutar la tecnología. También necesita descubrir todo lo interesante que existe más allá de ella.</blockquote>{buyButton('sales-v2-button sales-v2-button--inline')}</div></section>
        <section className="sales-v2-solution"><div className="sales-v2-solution__visual"><img src={mainCover} alt="Libro digital Infancia Más Allá de las Pantallas" /></div><div className="sales-v2-solution__copy"><p className="sales-v2-kicker">Conoce la colección</p><h2>No se trata solo de reducir pantallas. Se trata de recuperar posibilidades.</h2><p>Infancia Más Allá de las Pantallas convierte la orientación en acción: te ayuda a observar la rutina, establecer acuerdos, atravesar la resistencia y ofrecer experiencias que devuelven espacio a la curiosidad, el movimiento y la convivencia.</p><div className="sales-v2-benefits"><span>Límites claros</span><span>Alternativas por edad</span><span>Herramientas prácticas</span><span>Más conexión</span></div><div className="sales-v2-actions">{buyButton('sales-v2-button sales-v2-button--dark')}<button className="sales-v2-preview-button sales-v2-preview-button--dark" type="button" onClick={openPreview}>Hojear la colección</button></div></div></section>
        <section className="sales-v2-method"><div className="sales-v2-center-heading"><p className="sales-v2-kicker">Método Reconexión</p><h2>30 días. Cinco movimientos. Una nueva mirada a la rutina.</h2><p>Una secuencia progresiva para comenzar con lo que cabe hoy y transformar la intención en práctica.</p></div><div className="sales-v2-method__grid">{methodSteps.map(([title, description], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{description}</p></article>)}</div><div className="sales-v2-section-cta"><p>Empieza hoy la reconexión de tu familia.</p>{buyButton()}</div></section>
        <section className="sales-v2-tasting"><div className="sales-v2-tasting__copy"><p className="sales-v2-kicker">12 páginas para explorar</p><h2>Abre la colección. Descubre ideas que ya dan ganas de probar.</h2><p>Explora una selección no consecutiva del manual, los juegos y el calendario. Son páginas ilustradas, actividades y herramientas en español que convierten la orientación en momentos posibles.</p><button className="sales-v2-preview-button sales-v2-preview-button--large" type="button" onClick={openPreview}>Comenzar la muestra</button><small>Usa las flechas, el teclado o desliza en el celular.</small></div><button className="sales-v2-tasting__book sales-v2-tasting__book--stack" type="button" onClick={openPreview} aria-label="Abrir muestra interactiva con 12 páginas"><img src="/assets/es/books/100-juegos.png" alt="100 Juegos Fuera de las Pantallas" /><img src="/assets/es/books/calendario-reconexion.png" alt="Calendario de la Reconexión" /><img src="/assets/es/books/acuerdo-familiar.png" alt="Acuerdo Familiar" /><span>12 páginas · toca para hojear</span></button></section>
        <section className="sales-v2-manual"><div className="sales-v2-center-heading"><p className="sales-v2-kicker">Dentro del manual principal</p><h2>300 páginas para comprender, actuar y continuar.</h2></div><div className="sales-v2-manual__grid">{manualParts.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div><div className="sales-v2-section-cta sales-v2-section-cta--light"><p>Llévate el manual y todos los bonos.</p>{buyButton('sales-v2-button sales-v2-button--dark')}</div></section>
        <section className="sales-v2-bonuses"><div className="sales-v2-center-heading"><p className="sales-v2-kicker">La colección completa</p><h2>Y además recibes 5 bonos especiales.</h2><p>Materiales que llevan el método a las situaciones reales de tu hogar.</p></div><div className="sales-v2-bonus-grid">{bonuses.map((book) => <article key={book.number}><div className="sales-v2-bonus-cover"><img src={book.image} alt={`Portada oficial de ${book.title}`} /></div><div className="sales-v2-bonus-copy"><span>Bono especial n.º {book.number}</span><h3>{book.title}</h3><p>{book.description}</p><strong>{book.detail} · incluido</strong>{buyButton('sales-v2-mini-buy')}</div></article>)}</div></section>
        <section className="sales-v2-possibilities"><p className="sales-v2-kicker">Lo que empieza a caber en la rutina</p><h2>Más ideas para jugar.<br />Más claridad para acordar.<br /><em>Más presencia para vivir.</em></h2><div className="sales-v2-possibilities__grid"><span>Niños inventando juegos</span><span>Conversaciones más claras</span><span>Comidas con atención compartida</span><span>Momentos tranquilos antes de dormir</span><span>Proyectos creativos en familia</span><span>Alternativas para días ocupados</span></div>{buyButton('sales-v2-button sales-v2-button--possibilities')}</section>
        <section className="sales-v2-offer" id="oferta"><div className="sales-v2-offer__books" aria-label="Las seis portadas de la colección"><img className="offer-main-cover" src={mainCover} alt="Infancia Más Allá de las Pantallas" />{bonuses.map((book) => <img key={book.number} src={book.image} alt={book.title} />)}</div><div className="sales-v2-offer__copy"><p className="sales-v2-kicker">Oferta especial de lanzamiento</p><h2>Una biblioteca práctica para tu familia.</h2><ul><li>Manual principal de 300 páginas</li><li>Método Reconexión de 30 Días</li><li>Cinco ebooks complementarios</li><li>954 páginas en la colección completa</li><li>Herramientas, modelos, registros y actividades</li></ul><div className="sales-v2-price"><span>Oferta internacional</span><strong><small>US$</small> 6.90</strong><em>pago único</em></div>{buyButton('sales-v2-button sales-v2-button--offer')}<p className="sales-v2-microcopy">Colección digital · manual principal + 5 bonos</p></div></section>
        <section className="sales-v2-author" id="autor"><figure className="sales-v2-author__photo"><img src="/assets/author/marioth-nobre.webp" alt="Marioth Nobre, autor de la colección" /><figcaption>Marioth Nobre · Autor</figcaption></figure><div><p className="sales-v2-kicker">Sobre el autor</p><h2>Marioth Nobre</h2><p className="sales-v2-author__lead">Padre de tres hijos y autor de la colección Infancia Más Allá de las Pantallas.</p><p>Marioth une su experiencia como consultor especializado en procesos y negocios con la vida cotidiana de la paternidad. La colección nace de ese encuentro: organización práctica, observación de la rutina y el propósito de ayudar a otras familias a equilibrar tecnología y convivencia.</p><small>Editorial HubPages · Edición n.º 01 · 2026</small></div></section>
        <section className="sales-v2-faq"><div className="sales-v2-center-heading"><p className="sales-v2-kicker">Preguntas frecuentes</p><h2>Antes de comenzar.</h2></div><div className="sales-v2-faq__list">{questions.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div><div className="sales-v2-section-cta sales-v2-section-cta--light"><p>¿Listo para empezar?</p>{buyButton('sales-v2-button sales-v2-button--dark')}</div></section>
        <section className="sales-v2-final"><p className="sales-v2-kicker">El mejor momento para crear un nuevo recuerdo es el próximo.</p><h2>La infancia no espera.<br /><em>Los momentos en familia comienzan ahora.</em></h2><p>Empieza con una conversación, un juego, un acuerdo o unos minutos de atención compartida.</p><div className="sales-v2-price"><span>Oferta internacional por</span><strong><small>US$</small> 6.90</strong></div>{buyButton('sales-v2-button sales-v2-button--final')}<blockquote>“La infancia pasa demasiado rápido para vivirla a través de una pantalla.”</blockquote></section>
      </main>
      <footer className="sales-v2-footer"><div className="sales-v2-logo sales-v2-logo--footer"><span>Hub</span><strong>Pages</strong><i /></div><p>Infancia Más Allá de las Pantallas · Marioth Nobre · Edición n.º 01 · 2026</p></footer>
      <MetaPixel enabled={content.metaPixelEnabled} pixelId={content.metaPixelId} pageSlug={pageSlug} />
      <AnalyticsTracker pageSlug={pageSlug} />
      <div className="sales-v2-mobile-cta"><div><span>Oferta internacional</span><strong>US$ 6.90</strong></div><a href={content.ctaHref}>{content.ctaLabel}</a></div>
      {previewOpen && <div className="sales-v2-preview" role="dialog" aria-modal="true" aria-label="Muestra interactiva de la colección"><button className="sales-v2-preview__backdrop" type="button" onClick={() => setPreviewOpen(false)} aria-label="Cerrar muestra" /><div className="sales-v2-preview__panel"><div className="sales-v2-preview__header"><div><span>{page.source} · página {previewIndex + 1} de {previewPages.length}</span><strong>{page.label}</strong></div><button type="button" onClick={() => setPreviewOpen(false)} aria-label="Cerrar">×</button></div><div className="sales-v2-preview__progress" aria-hidden="true"><span style={{ width: `${((previewIndex + 1) / previewPages.length) * 100}%` }} /></div><div className="sales-v2-preview__viewer" onTouchStart={(event) => { previewTouchStart.current = event.touches[0]?.clientX ?? null }} onTouchEnd={(event) => { const start = previewTouchStart.current; const end = event.changedTouches[0]?.clientX; previewTouchStart.current = null; if (start == null || end == null || Math.abs(start - end) < 45) return; setPreviewIndex((current) => start > end ? (current + 1) % previewPages.length : (current - 1 + previewPages.length) % previewPages.length) }}><button type="button" onClick={() => setPreviewIndex((previewIndex - 1 + previewPages.length) % previewPages.length)} aria-label="Página anterior">‹</button><article className="sales-v2-sample-es"><div className="sales-v2-sample-es__image"><img src={page.image} alt="" style={{ objectPosition: page.position }} /></div><p>{page.kicker}</p><h3>{page.label}</h3><div className="sales-v2-sample-es__rule" /><p>{page.body}</p><small>Infancia Más Allá de las Pantallas · Marioth Nobre</small></article><button type="button" onClick={() => setPreviewIndex((previewIndex + 1) % previewPages.length)} aria-label="Página siguiente">›</button></div><div className="sales-v2-preview__thumbs sales-v2-preview__thumbs--es" aria-label="Elegir una página">{previewPages.map((item, index) => <button className={index === previewIndex ? 'is-active' : ''} type="button" key={item.label} onClick={() => setPreviewIndex(index)} aria-label={`Ver ${item.label}`} aria-current={index === previewIndex ? 'true' : undefined}><span>{index + 1}</span></button>)}</div><div className="sales-v2-preview__footer"><p><strong>Viste solo 12 páginas.</strong> La colección completa reúne 954 páginas de orientación, actividades y herramientas.</p>{buyButton('sales-v2-button sales-v2-button--preview')}</div></div></div>}
    </div>
  )
}
