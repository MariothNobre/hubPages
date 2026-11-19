import assert from 'node:assert/strict'
import { normalizePageUrl, resolvePageAddress } from '../server/page-address.mjs'
const keys = ['infancia_alem_das_telas', 'infancia_alem_das_telas_es']
const store = { pages: { infancia_alem_das_telas_es: { publicUrl: 'https://hubpages.com.br/nova-oferta/' } } }
assert.equal(normalizePageUrl(' https://HUBPAGES.com.br/nova-oferta/ '), 'https://hubpages.com.br/nova-oferta')
for (const value of ['http://example.com/oferta', 'https://example.com/admin', 'https://example.com/oferta?token=x']) assert.throws(() => normalizePageUrl(value))
assert.equal(normalizePageUrl('https://ebook.example.com'), 'https://ebook.example.com/')
assert.equal(resolvePageAddress(store, new URL('https://dev.hubpages.com.br/nova-oferta'), keys, 'https://dev.hubpages.com.br'), keys[1])
assert.equal(resolvePageAddress(store, new URL('https://hubpages.com.br/nova-oferta'), keys), keys[1])
assert.equal(resolvePageAddress(store, new URL('https://other.example.com/nova-oferta'), keys), undefined)
assert.equal(resolvePageAddress(store, new URL('https://dev.hubpages.com.br/infancia_alem_das_telas'), keys), keys[0])
console.log('PASS: normalized URL, validation, custom domain root and DEV alias preview')
