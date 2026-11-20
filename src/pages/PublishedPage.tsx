import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PublishedMetaPixel } from '../components/PublishedMetaPixel'
import { StudioCanvas } from '../components/StudioCanvas'
import type { Draft } from '../components/studio-model'
import '../studio.css'

export function PublishedPage() {
  const {pathname}=useLocation()
  const [publication,setPublication]=useState('')
  const [loadedPath,setLoadedPath]=useState('')
  const [draft,setDraft]=useState<Draft|null>(null)
  const [message,setMessage]=useState('Carregando página…')
  useEffect(()=>{
    let active=true
    fetch(`/api/public/resolve?url=${encodeURIComponent(window.location.origin+pathname)}`,{cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error('Esta página não existe ou não está publicada.');if(active){setDraft(data.draft);setPublication(data.id);setLoadedPath(pathname)}}).catch(error=>{if(active){setMessage(error.message);setLoadedPath(pathname);setDraft(null)}})
    return()=>{active=false}
  },[pathname])
  useEffect(()=>{if(!draft)return;const previous=document.title;document.title=draft.title||draft.name;return()=>{document.title=previous}},[draft])
  return draft&&loadedPath===pathname?<div className="public-studio-page"><PublishedMetaPixel key={publication} publicationId={publication} enabled={draft.metaPixelEnabled===true} pixelId={draft.metaPixelId}/><StudioCanvas draft={draft} interactive/></div>:<main className="public-page-message"><h1>{loadedPath&&loadedPath!==pathname?'Carregando página…':message}</h1></main>
}
