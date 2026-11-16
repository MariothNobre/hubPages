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
  sections: Array<{
    number: string
    title: string
    description: string
  }>
}

// Texto provisório de estrutura. O conteúdo oficial fornecido pelo cliente
// substituirá estes campos antes da publicação da nova experiência.
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
      'A HubPages está nascendo como uma central de ebooks: um espaço para descobrir conteúdos, aprofundar temas e transformar conhecimento em ação.',
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
      'A primeira página de vendas da HubPages está sendo preparada. O conteúdo oficial, a capa e a oferta serão incorporados nesta estrutura.',
    action: 'Ver página em preparação',
  },
}

export const infanciaDraft: SalesPageContent = {
  redLine: 'Conteúdo oficial em preparação',
  eyebrow: 'Primeiro lançamento HubPages',
  title: 'Infância Além das Telas',
  description:
    'A estrutura comercial está pronta para receber a Red Line, a promessa, os benefícios, a apresentação do ebook, a oferta e o checkout.',
  ctaLabel: 'Ver estrutura preparada',
  ctaHref: '#estrutura',
  status: 'Template editorial de vendas',
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
