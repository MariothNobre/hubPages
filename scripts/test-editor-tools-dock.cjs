const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict')
for(const extension of ['.tsx','.ts'])require.extensions[extension]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)
require.extensions['.css']=()=>{}
;(async()=>{
 const {Window}=await import('happy-dom'),window=new Window({url:'http://localhost:4205'})
 for(const key of ['window','document','HTMLElement','Element','Node','ShadowRoot','MutationObserver','ResizeObserver'])global[key]=key==='window'?window:window[key]
 global.IS_REACT_ACT_ENVIRONMENT=true
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client')
 const {EditorToolsDock}=require('../src/components/EditorToolsDock.tsx'),{FloatingTools}=require('../src/components/FloatingTools.tsx'),{TextColorProvider}=require('../src/components/TextColors.tsx'),{InlineText}=require('../src/components/InlineText.tsx')
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 let latest={textColors:{},title:'Título original'},changes=0,closed=0
 function Fixture(){const[draft,setDraft]=React.useState(latest);const editing={update(change){changes++;setDraft(previous=>{latest={...previous,...(typeof change==='function'?change(previous):change)};return latest})}};return React.createElement(EditorToolsDock,{title:'Bloco de teste',tools:React.createElement('button',null,'Duplicar bloco')},React.createElement(TextColorProvider,{draft,editing},React.createElement(InlineText,{colorKey:'title',value:draft.title,label:'Editar título',onSelect(){},onChange(value){if(value!==draft.title)editing.update({title:value})}}),React.createElement(FloatingTools,{className:'hp-object-panel',title:'Caixas e objetos',label:'Objeto selecionado',onClose(){closed++}},React.createElement('button',null,'Excluir caixa de fundo'))))}
 await act(async()=>root.render(React.createElement(Fixture)))
 const sidebar=host.querySelector('.editor-tools-sidebar'),tab=host.querySelector('.editor-tools-tab')
 assert.ok(sidebar.contains(document.querySelector('[aria-label="Objeto selecionado"]')),'object panel must live in the single sidebar')
 assert.equal(document.querySelectorAll('.floating-tools').length,0,'no floating windows in dock mode')
 const field=host.querySelector('[aria-label="Editar título"]')
 await act(async()=>field.click())
 assert.ok(sidebar.contains(document.querySelector('[aria-label="Cor do texto selecionado"]')),'text controls must share the sidebar')
 const color=sidebar.querySelector('[aria-label="Cor do texto #c62828"]')
 await act(async()=>{color.dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,composed:true}));color.focus();color.click()})
 assert.equal(latest.textColors.title,'#c62828','using dock controls preserves the text selection')
 assert.equal(field.getAttribute('data-text-color'),'#c62828')
 const before=changes
 await act(async()=>tab.click());assert.equal(sidebar.hidden,true);assert.equal(tab.getAttribute('aria-expanded'),'false')
 assert.ok(host.contains(field),'collapsing does not unmount the editable canvas')
 await act(async()=>tab.click());assert.equal(sidebar.hidden,false);assert.equal(changes,before,'show/hide never changes draft or undo')
 await act(async()=>sidebar.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
 assert.equal(sidebar.hidden,true);await act(async()=>tab.click())
 const object=sidebar.querySelector('[aria-label="Objeto selecionado"]')
 await act(async()=>object.querySelector('button').click());assert.equal(closed,1)
 await act(async()=>root.unmount())
 assert.equal(document.querySelectorAll('.text-color-toolbar,.hp-object-panel').length,0,'portals clean up on leaving the editor')
 console.log('PASS: single contextual sidebar, object/text portals, focused color edits, collapse/expand/Escape without draft mutation and portal cleanup')
})().catch(error=>{console.error(error);process.exitCode=1})
