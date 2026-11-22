import {useTextColor} from './text-color-context'
import { useLayoutEffect, useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'

// React owns the persisted plain text; the focused DOM owns its caret/IME composition.
export function InlineText({ colorKey, as = 'span', value, label, onChange, onSelect, className, multiline = false, max = 5000 }: { colorKey?:string;as?: string; value: string; label: string; onChange: (value: string) => void; onSelect: () => void; className?: string; multiline?: boolean; max?: number }) {
  const textColor=useTextColor(colorKey)
  const select=()=>{onSelect();textColor.select(label)}
  const element = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const node=element.current
    if(node && (node.getRootNode() instanceof ShadowRoot?(node.getRootNode() as ShadowRoot).activeElement:document.activeElement)!==node && node.textContent!==value) node.textContent=value
  },[value])
  const commit = (node: HTMLElement) => {
    const text=(multiline ? node.innerText : (node.textContent||'').replace(/\n/g,' ')).replace(/\r/g,'').slice(0,max)
    if(node.innerText.length>max) node.textContent=text
    onChange(text)
  }
  const paste = (event: ClipboardEvent<HTMLElement>) => {
    event.preventDefault()
    const selection=window.getSelection()
    if(!selection?.rangeCount) return
    const range=selection.getRangeAt(0)
    if(!event.currentTarget.contains(range.commonAncestorContainer)) return
    const text=event.clipboardData.getData('text/plain').slice(0,max)
    const node=document.createTextNode(multiline ? text : text.replace(/\r?\n/g,' '))
    range.deleteContents();range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range)
    commit(event.currentTarget)
  }
  const Tag = as as 'div' | 'span' | 'p' | 'h1' | 'h2' | 'strong' | 's'
  return <Tag ref={(node:HTMLElement|null)=>{element.current=node}} contentEditable="plaintext-only" suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline={multiline} data-placeholder={label} className={`canvas-inline-text ${className || ''}`} tabIndex={0} data-text-color={textColor.color} style={textColor.color?{color:textColor.color,'--hp-text-color':textColor.color} as React.CSSProperties:undefined} onFocus={select} onClick={(e)=>{e.preventDefault();e.stopPropagation();select()}} onInput={(e)=>{if(!(e.nativeEvent as InputEvent).isComposing)commit(e.currentTarget)}} onCompositionEnd={(e)=>commit(e.currentTarget)} onBlur={(e)=>commit(e.currentTarget)} onPaste={paste} onKeyDown={(e:KeyboardEvent<HTMLElement>)=>{e.stopPropagation();if((e.key==='Enter'&&!multiline)||e.key==='Escape'){e.preventDefault();e.currentTarget.blur()}}}/>
}
