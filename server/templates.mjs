import { readFile } from 'node:fs/promises'
const infancia = JSON.parse(await readFile(new URL('./templates/infancia-pt.json', import.meta.url), 'utf8'))
const infanciaEs=JSON.parse(await readFile(new URL('./templates/infancia-es.json',import.meta.url),'utf8'))
const sabor=JSON.parse(await readFile(new URL('./templates/sabor-pt.json',import.meta.url),'utf8'))
export const templates = [
  { id: 'infancia_pt', name: 'Aurora', description: 'Uma história que conecta: apresentação editorial, oferta, coleção, degustação, autor e perguntas frequentes. Seis paletas para dar a sua identidade.', imageUrl: '/assets/books/infancia-alem-das-telas.webp' },
  {id:'sabor_pt',name:'Sabor',category:'GASTRONOMIA',description:'Seu ponto de partida para vender uma coleção gastronômica: página importada, editável e preparada em português brasileiro, com fotos, vídeos, bônus, oferta e FAQ.',imageUrl:'/assets/templates/sabor/produto-principal-pt.png',shots:['hero','colecao','oferta','faq'].map(section=>'/assets/templates/sabor/preview-'+section+'.jpg'),originalTheme:{ink:'#172017',primary:'#08c628',dark:'#164a28',accent:'#fa6e21',gold:'#ffdd97',paper:'#fff7ea',soft:'#edffe9',hero:'#fffaf3',mood:'Verde vivo, laranja e cozinha caseira'}},
]
export function templateInput(input) {
  if(input?.template==='sabor_pt')return{...structuredClone(sabor),name:input.name||sabor.name,colorTheme:input.colorTheme||'original',step:1,visitedSteps:[],reviewedSignature:'',checkoutUrl:'',publicUrl:'',metaPixelId:'',metaPixelEnabled:false,ga4Id:''}
  if (!['infancia_pt','infancia_es'].includes(input?.template)) return input
  return { ...structuredClone(input.template==='infancia_es'?infanciaEs:infancia), name: input.name || 'Minha nova página', template: input.template, ...(input.colorTheme===undefined?{}:{colorTheme:input.colorTheme}), step: 1, checkoutUrl: '', publicUrl: '', metaPixelId: '', ga4Id: '' }
}
