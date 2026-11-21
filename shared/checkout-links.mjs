// Match the draft API's HTTPS contract without interrupting an unfinished edit.
export function validCheckoutLink(value,allowAnchor=false){
  if(typeof value!=='string'||value.length>2000)return false
  if(!value.trim())return true
  if(allowAnchor&&/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(value))return true
  try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password}catch{return false}
}
export function checkoutLinkProblem(draft){
  if(!validCheckoutLink(draft.checkoutUrl||'',true))return {label:'Link padrão de compra',step:4}
  for(const [scope,button]of Object.entries(draft.templateButtons||{}))if(!validCheckoutLink(button.url||''))return {label:`Link individual do botão ${scope}`,step:4}
  for(const block of draft.blocks||[])if(!validCheckoutLink(block.buttonUrl||''))return {label:`Link do botão da seção ${block.title||'sem título'}`,step:4}
  return null
}
