import { useEffect, useRef } from 'react'

export function DeletePageDialog({name,busy,error,onCancel,onConfirm}:{name:string;busy:boolean;error:string;onCancel:()=>void;onConfirm:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{dialog.current?.showModal()},[])
  return <dialog className="studio-delete-dialog" ref={dialog} aria-labelledby="delete-page-title" onCancel={event=>{event.preventDefault();if(!busy)onCancel()}}>
    <h2 id="delete-page-title">Excluir página?</h2><p><strong>{name}</strong> será movida para a lixeira. Se estiver publicada, deixará de ficar disponível.</p><p>Você poderá restaurar a página com seus textos, imagens e histórico. A restauração volta como rascunho.</p>{error&&<p role="alert">{error}</p>}<div><button autoFocus disabled={busy} onClick={onCancel}>Cancelar</button><button className="studio-danger" disabled={busy} onClick={onConfirm}>{busy?'Excluindo…':'Excluir página'}</button></div>
  </dialog>
}
