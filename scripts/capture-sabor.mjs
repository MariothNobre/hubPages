import fs from 'node:fs/promises'
import {importSalesPage} from '../server/import-page.mjs'
const directory='work/import-preview';await fs.mkdir(directory,{recursive:true})
const result=await importSalesPage('https://comericoenminutos.online/')
await fs.writeFile(directory+'/capture-final.json',JSON.stringify(result.draft,null,2)+'\n')
for(const media of result.media){const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'}[media.mime];await fs.writeFile(directory+'/'+media.slot+'.'+ext,media.content)}
console.log('Captured authorized demo:',JSON.stringify(result.draft.imported.report))
