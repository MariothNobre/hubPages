import fs from 'node:fs'
import ts from 'typescript'
const source=fs.readFileSync('src/pages/InfanciaAlemDasTelasEs.tsx','utf8'),file=ts.createSourceFile('es.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
function variable(file,name){let result;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(file)===name)result=Function(`return (${node.initializer.getText(file)})`)();ts.forEachChild(node,visit)}visit(file);return result}
const defaultsFile=ts.createSourceFile('content.ts',fs.readFileSync('src/content/siteContent.ts','utf8'),ts.ScriptTarget.Latest,true)
const defaults={infancia_alem_das_telas:variable(defaultsFile,'infanciaDraft'),infancia_alem_das_telas_es:variable(defaultsFile,'infanciaEsDraft')}
fs.writeFileSync('server/templates/legacy-defaults.json',JSON.stringify(defaults,null,2)+'\n')
const es={...JSON.parse(fs.readFileSync('server/templates/infancia-pt.json','utf8')), ...defaults.infancia_alem_das_telas_es,name:'Infancia Más Allá de las Pantallas',locale:'es',priceLabel:'US$ 6.90',originalPrice:'',imageUrl:'/assets/es/books/infancia-mas-alla-de-las-pantallas.png'}
delete es.ctaHref;delete es.status;delete es.sections
const bonuses=variable(file,'bonuses'),samples=variable(file,'previewPages'),questions=variable(file,'questions')
const texts=node=>{const result=[];function visit(n){if(ts.isJsxText(n)&&n.getText(file).trim())result.push(n.getText(file).trim());ts.forEachChild(n,visit)}visit(node);return result.join(' ')}
const sections={};function scan(n){if(ts.isJsxElement(n)){const cls=n.openingElement.attributes.properties.find(a=>a.name?.getText(file)==='className')?.initializer?.text;if(cls?.startsWith('sales-v2-'))sections[cls.slice(9)]=n}ts.forEachChild(n,scan)}scan(file)
es.blocks=es.blocks.map(b=>{const block={...b};if(b.kind==='bonus'){const x=bonuses[Number(b.templateRole.split('-')[1])];return {...block,title:x.title,body:x.description+'\n'+x.detail+' · incluido',imageUrl:x.image}}
if(b.kind==='sample'){const x=samples[Number(b.templateRole.split('-')[1])];return {...block,title:x.label,body:x.teaser||x.body,imageUrl:x.image}}
if(b.kind==='faq'){const x=questions[Number(b.templateRole.split('-')[1])];return {...block,title:x[0],body:x[1]}}
const section=sections[b.templateRole];if(section){let title='',paragraphs=[];function visit(n){if(ts.isJsxElement(n)){const tag=n.openingElement.tagName.getText(file);if(tag==='h2'&&!title)title=texts(n);if(['p','blockquote','li'].includes(tag)){const value=texts(n);if(value)paragraphs.push(value)}}ts.forEachChild(n,visit)}visit(section);block.title=title||block.title;block.body=paragraphs.join('\n\n')}
if(b.templateRole==='method')block.body=variable(file,'methodSteps').map(([title,body])=>title+' — '+body).join('\n\n')
if(b.templateRole==='manual')block.body=variable(file,'manualParts').map(([,title,body])=>title+' — '+body).join('\n\n')
if(block.imageUrl==='/assets/books/infancia-alem-das-telas.webp')block.imageUrl=es.imageUrl
return block})
fs.writeFileSync('server/templates/infancia-es.json',JSON.stringify(es,null,2)+'\n')
