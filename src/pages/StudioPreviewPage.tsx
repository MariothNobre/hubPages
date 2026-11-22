import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StudioCanvas } from '../components/StudioCanvas'
import type { Draft } from '../components/studio-model'
import '../studio.css'

export function StudioPreviewPage() {
  const { id } = useParams()
  const embedded=new URLSearchParams(window.location.search).get('embedded')==='1'&&window.parent!==window
  const [draft,setDraft] = useState<Draft | null>(null)
  const [notice,setNotice] = useState('Carregando prévia privada…')
  useEffect(()=>{
    let active=true,authorized=false
    const receive=(event:MessageEvent)=>{if(authorized&&event.origin===window.location.origin&&event.source===window.parent&&event.data?.type==='hubpages:preview-draft'&&event.data.pageId===id&&event.data.draft&&typeof event.data.draft==='object')setDraft(event.data.draft)}
    if(embedded)window.addEventListener('message',receive)
    fetch(`/api/platform/pages/${id}`,{credentials:'same-origin',cache:'no-store'}).then(async(response)=>{const result=await response.json();if(!response.ok) throw new Error(result.message);if(active){authorized=true;setDraft(result.draft);if(embedded)window.parent.postMessage({type:'hubpages:preview-ready',pageId:id},window.location.origin)}}).catch((error)=>{if(active){setNotice(error.message);if(embedded)window.parent.postMessage({type:'hubpages:preview-error',pageId:id},window.location.origin)}})
    return()=>{active=false;window.removeEventListener('message',receive)}
  },[id,embedded])
  return <div onClickCapture={event=>{if(!embedded||!(event.target instanceof Element))return;const anchor=event.target.closest('a');if(anchor instanceof HTMLAnchorElement&&anchor.href){const url=new URL(anchor.href);if(url.origin!==window.location.origin||url.pathname!==window.location.pathname){anchor.target='_blank';anchor.rel='noopener noreferrer'}}}} className={`${(!!draft?.imported||['infancia_pt','infancia_es'].includes(draft?.template||''))?'private-preview legacy-preview-shell':'studio private-preview'}${embedded?' is-embedded':''}`}>{!embedded&&<div className="private-preview-bar"><span>PRÉVIA PRIVADA · NÃO PUBLICADA · links abrem em nova aba</span><Link to="/studio">Voltar ao Studio</Link></div>}{draft ? <StudioCanvas draft={draft} interactive /> : <p role="status">{notice} <Link to="/conta">Entrar na conta</Link></p>}</div>
}
