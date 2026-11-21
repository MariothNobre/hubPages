import { templateTheme } from '../../shared/template-themes.mjs'
import { useEffect,useState } from 'react'
import { useParams } from 'react-router-dom'
import { StudioCanvas } from '../components/StudioCanvas'
import type { Draft } from '../components/studio-model'
import '../studio.css'
export function TemplatePreviewPage(){const{id}=useParams(),[draft,setDraft]=useState<Draft|null>(null),[message,setMessage]=useState('Carregando o modelo…');useEffect(()=>{let active=true;fetch(`/api/platform/templates/${id}/preview`,{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.message);if(active)setDraft({...data.draft,colorTheme:templateTheme(new URLSearchParams(window.location.search).get('theme')||undefined).id})}).catch(error=>{if(active)setMessage(error.message)});return()=>{active=false}},[id]);return draft?<div className="private-preview legacy-preview-shell"><StudioCanvas draft={draft} interactive/></div>:<main className="public-page-message"><p role="status">{message}</p></main>}
