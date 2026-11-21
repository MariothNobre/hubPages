import { useId,useState } from 'react'
import { validCheckoutLink } from '../../shared/checkout-links.mjs'
export function CheckoutLinkInput({value,onChange,label,allowAnchor=false}:{label:string;value:string;onChange:(value:string)=>void;allowAnchor?:boolean}){
  const id=useId(),[focused,setFocused]=useState(false),[buffer,setBuffer]=useState(value)
  const shown=focused?buffer:value,invalid=!validCheckoutLink(shown,allowAnchor)
  return <><input type="url" aria-label={label} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={2000} value={shown} aria-invalid={!focused&&invalid} aria-describedby={invalid?id:undefined} onFocus={()=>{setBuffer(value);setFocused(true)}} onBlur={()=>setFocused(false)} onChange={event=>{setBuffer(event.target.value);onChange(event.target.value)}}/>{invalid&&<span id={id} role="status" className={'checkout-link-help '+(focused?'is-typing':'is-invalid')}>{focused?'Continue digitando o link HTTPS. Ele será salvo quando estiver completo.':'Complete o link com https:// e um endereço válido, sem usuário ou senha na URL.'}</span>}</>
}
