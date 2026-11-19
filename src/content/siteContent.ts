export interface NavigationItem {
  label: string
  href: string
}

export interface SiteContent {
  navigation: NavigationItem[]
  hero: {
    eyebrow: string
    title: string
    highlight: string
    description: string
    primaryAction: string
    secondaryAction: string
  }
  pillars: Array<{
    number: string
    title: string
    description: string
  }>
  firstRelease: {
    eyebrow: string
    title: string
    description: string
    action: string
  }
}

export interface SalesPageContent {
  redLine: string
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  status: string
  metaPixelId: string
  metaPixelEnabled: boolean
  sections: Array<{
    number: string
    title: string
    description: string
  }>
}

export const hubPagesDraft: SiteContent = {
  navigation: [
    { label: 'A HubPages', href: '#sobre' },
    { label: 'Ebooks', href: '#ebooks' },
    { label: 'Como funciona', href: '#como-funciona' },
  ],
  hero: {
    eyebrow: 'Conhecimento em movimento',
    title: 'Ideias que encontram',
    highlight: 'quem precisa delas.',
    description:
      'A HubPages é uma central de ebooks criada para aproximar conteúdos relevantes das pessoas que procuram transformar conhecimento em ação.',
    primaryAction: 'Conhecer o primeiro lançamento',
    secondaryAction: 'Entender a HubPages',
  },
  pillars: [
    {
      number: '01',
      title: 'Descubra',
      description: 'Encontre ebooks organizados por temas e momentos de interesse.',
    },
    {
      number: '02',
      title: 'Aprofunde',
      description: 'Conheça a proposta de cada obra antes de escolher o seu próximo conteúdo.',
    },
    {
      number: '03',
      title: 'Avance',
      description: 'Acesse materiais digitais criados para apoiar reflexão e prática.',
    },
  ],
  firstRelease: {
    eyebrow: 'Primeiro lançamento',
    title: 'Infância Além das Telas',
    description:
      'Conheça a coleção digital criada para ajudar famílias a equilibrar o uso de telas e recuperar espaço para brincadeiras, conversas e conexão.',
    action: 'Conhecer a coleção',
  },
}

export const infanciaDraft: SalesPageContent = {
  redLine: 'Oferta especial: coleção completa de R$ 197,00 por R$ 29,90',
  eyebrow: 'Método prático para famílias com crianças de 3 a 10 anos',
  title: 'Seu filho merece uma infância cheia de memórias, não apenas de telas.',
  description:
    'Descubra uma jornada prática de 30 dias para estabelecer limites com mais clareza, encontrar alternativas ao celular e criar novos momentos de conexão em família.',
  ctaLabel: 'Quero a coleção completa',
  ctaHref: '#oferta',
  status: 'Página oficial de vendas',
  metaPixelId: '',
  metaPixelEnabled: false,
  sections: [
    {
      number: '01',
      title: 'Problema e contexto',
      description: 'Espaço reservado para conectar a realidade do público ao tema central do ebook.',
    },
    {
      number: '02',
      title: 'Transformação proposta',
      description: 'Espaço reservado para apresentar o método, o conteúdo e os benefícios reais da obra.',
    },
    {
      number: '03',
      title: 'Oferta e decisão',
      description: 'Espaço reservado para preço, garantia, checkout, perguntas frequentes e CTA final.',
    },
  ],
}

export const infanciaEsDraft: SalesPageContent = {
  redLine: 'Oferta especial internacional: colección completa por US$ 6.90',
  eyebrow: 'Método práctico para familias con niños de 3 a 10 años',
  title: 'Tu hijo merece una infancia llena de recuerdos, no solo de pantallas.',
  description:
    'Descubre un recorrido práctico de 30 días para establecer límites con mayor claridad, encontrar alternativas al celular y crear nuevos momentos de conexión familiar.',
  ctaLabel: 'Quiero la colección completa',
  ctaHref: '#oferta',
  status: 'Página oficial de ventas en español',
  metaPixelId: '',
  metaPixelEnabled: false,
  sections: [
    { number: '01', title: 'Problema y contexto', description: 'Conecta la realidad de las familias con el tema central del ebook.' },
    { number: '02', title: 'Transformación propuesta', description: 'Presenta el método, el contenido y los beneficios de la colección.' },
    { number: '03', title: 'Oferta y decisión', description: 'Precio, garantía, checkout, preguntas frecuentes y llamada final.' },
  ],
}
