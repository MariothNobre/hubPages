import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StudioCanvas } from '../components/StudioCanvas'
import type { Draft } from '../components/studio-model'
import '../studio.css'

export function PublishedPage() {
  const {id}=useParams()
  const [draft,setDraft]=useState<Draft|null>(null)
  const [message,setMessage]=useState('Carregando página…')
  useEffect(()=>{
    let active=true
    fetch(`/api/public/pages/${id}`,{cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error('Esta página não existe ou não está publicada.');if(active)setDraft(data.draft)}).catch(error=>{if(active)setMessage(error.message)})
    return()=>{active=false}
  },[id])
  useEffect(()=>{if(!draft)return;const previous=document.title;document.title=draft.title||draft.name;return()=>{document.title=previous}},[draft])
  return draft?<div className="public-studio-page"><StudioCanvas draft={draft} interactive/></div>:<main className="public-page-message"><h1>{message}</h1></main>
}
