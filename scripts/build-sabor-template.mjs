import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {parseFragment,serialize} from 'parse5'
import {validateDraft} from '../server/platform.mjs'
const work='work/import-preview',target='public/assets/templates/sabor'
const translations=JSON.parse(await fs.readFile('server/templates/sabor-translations.json','utf8'))
const source=JSON.parse(await fs.readFile(work+'/capture-final.json','utf8'))
const map=JSON.parse(await fs.readFile('server/templates/sabor-media-localization.json','utf8'))
const files=await fs.readdir(work),hash=buffer=>createHash('sha256').update(buffer).digest('hex')
const unknown=new Set(),translate=value=>{const trimmed=value.replace(/\s+/g,' ').trim();if(!trimmed)return value;const result=translations[trimmed];if(result!==undefined)return value.replace(value.trim(),result);if(/[a-zA-ZÁ-ÿ]{3}/.test(trimmed))unknown.add(trimmed);return value}
function walk(node){if(node.nodeName==='#text')node.value=translate(node.value);for(const attr of node.attrs||[])if(['alt','title','aria-label'].includes(attr.name))attr.value=translate(attr.value);for(const child of node.childNodes||[])walk(child)}
for(const block of source.blocks){const tree=parseFragment(block.importHtml);walk(tree);block.importHtml=serialize(tree);const text=block.importHtml.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();block.title=block.importHtml.includes('<video')?'Vídeo de apresentação':text.slice(0,120)||'Área visual';}
for(const button of Object.values(source.templateButtons||{}))button.label=translate(button.label)
await fs.mkdir(target,{recursive:true})
for(const asset of source.importedAssets){const file=files.find(file=>file.startsWith(asset.id+'.'));if(!file)throw Error('Missing captured media '+asset.id);const content=await fs.readFile(work+'/'+file),digest=hash(content);let name=map[digest];if(!name){name='media-'+digest.slice(0,16)+'.'+file.split('.').pop();await fs.copyFile(work+'/'+file,target+'/'+name)}else await fs.access(target+'/'+name);asset.imageUrl='/assets/templates/sabor/'+name;asset.title=asset.mediaType==='video'?'Vídeo de apresentação':'Imagem da coleção'}
source.template='sabor_pt';source.name='Coma Bem em Minutos';source.title='Mais uma vez sem ideias para comer bem hoje?';source.description='Uma coleção digital para simplificar suas refeições.';source.step=1;source.visitedSteps=[];source.addressAuto=true;source.colorTheme='original';source.imageUrl='/assets/templates/sabor/produto-principal-pt.png';source.metaPixelId='';source.metaPixelEnabled=false;source.ga4Id='';source.checkoutUrl='';source.publicUrl='';source.imported.modelName='Sabor';source.imported.localized=true;source.imported.hubpagesCreated=true
if(unknown.size)throw Error('Review untranslated source text: '+JSON.stringify([...unknown]))
const draft=validateDraft(source)
await fs.writeFile('server/templates/sabor-pt.json',JSON.stringify(draft,null,2)+'\n')
console.log('Sabor PT-BR prepared:',draft.blocks.length,'sections,',draft.importedAssets.length,'media. Remaining text to review:',JSON.stringify([...unknown]))
