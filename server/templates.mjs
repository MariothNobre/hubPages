import { readFile } from 'node:fs/promises'
const infancia = JSON.parse(await readFile(new URL('./templates/infancia-pt.json', import.meta.url), 'utf8'))
export const templates = [
  { id: 'infancia_pt', name: 'Infância Além das Telas', description: 'Página legada em português: oferta, coleção, degustação, autor e perguntas frequentes.', imageUrl: '/assets/books/infancia-alem-das-telas.webp' },
  { id: 'essencial', name: 'Essencial', description: 'Oferta e benefícios.', imageUrl: '' },
  { id: 'colecao', name: 'Coleção', description: 'Produto e seções em cartões.', imageUrl: '' },
]
export function templateInput(input) {
  if (input?.template !== 'infancia_pt') return input
  return { ...structuredClone(infancia), name: input.name || 'Minha nova página', template: 'infancia_pt', step: 1, checkoutUrl: '', publicUrl: '', metaPixelId: '', ga4Id: '' }
}
