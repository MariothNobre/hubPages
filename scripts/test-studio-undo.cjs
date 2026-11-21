const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)
const {StudioUndo}=require('../src/components/StudioUndo.ts')
;(async()=>{
  const history=new StudioUndo(),id='test-page',url='/api/platform/pages/'+id+'/images/slot'
  const original={title:'Antes',imageUrl:'',blocks:[{id:'slot',imageUrl:url,body:'Original'}]}
  global.fetch=async requested=>{assert.equal(requested,url);return new Response(new Blob(['original-image'],{type:'image/webp'}))}
  const removed={...original,blocks:[]},before=history.slots(original,id),after=history.slots(removed,id)
  history.record(original,history.capture(original,id,[...before.keys()].filter(slot=>!after.has(slot))))
  original.blocks[0].body='Mutação posterior'
  await history.settled()
  const last=history.entries.at(-1);assert.equal(last.draft.blocks[0].body,'Original');assert.equal(await (await last.media).get('slot').text(),'original-image')
  assert.equal(last.bytes,14)
  history.record(removed);assert.equal(history.entries.length,2);assert.deepEqual(history.entries.pop().draft.blocks,[]);assert.equal(history.entries.pop().draft.blocks.length,1)
  for(let n=0;n<55;n++)history.record({...removed,title:String(n)})
  await history.settled();assert.equal(history.entries.length,50);assert.equal(history.entries[0].draft.title,'5')
  const big=new Blob([new Uint8Array(26*1024*1024)])
  history.clear();for(let n=0;n<5;n++)history.record(removed,Promise.resolve(new Map([['slot',big]])))
  await history.settled();assert.equal(history.entries.length,3,'RAM for media undo is bounded to 100 MB')
  history.clear();assert.equal(history.entries.length,0)
  console.log('PASS: session undo snapshots, removal with media, ordered changes, page reset and bounded RAM; no online library')
})().catch(error=>{console.error(error);process.exitCode=1})
