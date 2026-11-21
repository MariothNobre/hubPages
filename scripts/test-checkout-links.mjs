import assert from 'node:assert/strict'
import {validCheckoutLink,checkoutLinkProblem} from '../shared/checkout-links.mjs'
import {validateDraft} from '../server/platform.mjs'
const partials=['h','ht','htt','http','https','https:','https:/','https://','https://?']
for(const value of partials){assert.equal(validCheckoutLink(value),false,value);assert.equal(checkoutLinkProblem({checkoutUrl:value}).step,4);assert.throws(()=>validateDraft({checkoutUrl:value}),/HTTPS/)}
for(const value of ['', 'https://pay.hotmart.com/example?off=abc&src=campanha','https://zapper.chat',' https://zapper.chat ']){assert.equal(validCheckoutLink(value),true);assert.equal(checkoutLinkProblem({checkoutUrl:value}),null);validateDraft({checkoutUrl:value})}
for(const value of ['http://example.test','javascript:alert(1)','https://user:password@example.test','https://'+'a'.repeat(2000)])assert.equal(validCheckoutLink(value),false)
assert.equal(validCheckoutLink('#oferta',true),true);assert.equal(validCheckoutLink('#oferta'),false)
assert.match(checkoutLinkProblem({checkoutUrl:'',templateButtons:{hero:{url:'https://'}}}).label,/hero/)
assert.match(checkoutLinkProblem({checkoutUrl:'',blocks:[{title:'Meu bônus',buttonUrl:'https://'}]}).label,/Meu bônus/)
assert.equal(checkoutLinkProblem({checkoutUrl:'https://pay.example.test/buy',templateButtons:{hero:{url:'https://pay.example.test/other'}},blocks:[{buttonUrl:''}]}),null)
console.log('PASS: unfinished checkout links pause autosave; complete links pass; default and individual URLs retain the API HTTPS security contract')
