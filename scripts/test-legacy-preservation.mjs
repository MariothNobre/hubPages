import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const base = 'ca0574981d787323dd5e20ddefc2a07ba1906f2f'
const paths = ['src/components/Brand.tsx', 'src/components/MetaPixel.tsx', 'src/components/AnalyticsTracker.tsx', 'src/pages/InfanciaAlemDasTelas.tsx', 'src/pages/InfanciaAlemDasTelasEs.tsx', 'src/styles.css']
for (const path of paths) assert.equal(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'), execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).replace(/\r\n/g, '\n'), `${path} must remain compatible with the approved baseline`)
execFileSync('git',['diff','--exit-code',base,'--','public',':(exclude)public/assets/templates/sabor/**',...['hero','metodo','colecao','oferta'].map(s=>':(exclude)public/assets/templates/infancia-'+s+'.jpg')],{stdio:'pipe'})
console.log('PASS: legacy PT/ES pages, brand, all public assets, Meta Pixel, online tracker and legacy CSS unchanged')
