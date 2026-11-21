import { readFile } from 'node:fs/promises'
const infancia = JSON.parse(await readFile(new URL('./templates/infancia-pt.json', import.meta.url), 'utf8'))
const infanciaEs=JSON.parse(await readFile(new URL('./templates/infancia-es.json',import.meta.url),'utf8'))
export const templates = [
  { id: 'infancia_pt', name: 'Aurora', description: 'Uma história que conecta: apresentação editorial, oferta, coleção, degustação, autor e perguntas frequentes. Seis paletas para dar a sua identidade.', imageUrl: '/assets/books/infancia-alem-das-telas.webp' },
]
export function templateInput(input) {
  if (!['infancia_pt','infancia_es'].includes(input?.template)) return input
  return { ...structuredClone(input.template==='infancia_es'?infanciaEs:infancia), name: input.name || 'Minha nova página', template: input.template, ...(input.colorTheme===undefined?{}:{colorTheme:input.colorTheme}), step: 1, checkoutUrl: '', publicUrl: '', metaPixelId: '', ga4Id: '' }
}
