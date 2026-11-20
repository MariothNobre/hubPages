import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StudioCanvas } from '../components/StudioCanvas'
import type { Draft } from '../components/studio-model'
import '../studio.css'

export function StudioPreviewPage() {
  const { id } = useParams()
  const [draft,setDraft] = useState<Draft | null>(null)
  const [notice,setNotice] = useState('Carregando prévia privada…')
  useEffect(()=>{
    let active=true
    fetch(`/api/platform/pages/${id}`,{credentials:'same-origin',cache:'no-store'}).then(async(response)=>{const result=await response.json();if(!response.ok) throw new Error(result.message);if(active) setDraft(result.draft)}).catch((error)=>{if(active) setNotice(error.message)})
    return()=>{active=false}
  },[id])
  return <div className={draft?.template==='infancia_pt'?'private-preview legacy-preview-shell':'studio private-preview'}><div className="private-preview-bar"><span>PRÉVIA PRIVADA · NÃO PUBLICADA · links abrem em nova aba</span><Link to="/studio">Voltar ao Studio</Link></div>{draft ? <StudioCanvas draft={draft} interactive /> : <p role="status">{notice} <Link to="/conta">Entrar na conta</Link></p>}</div>
}
