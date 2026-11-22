import type {CSSProperties} from 'react'
export const clampBlockHeight=(value:number)=>Math.max(0,Math.min(6000,Math.round(value)))
// A minimum preserves responsive content instead of clipping it when text wraps.
export const blockHeightStyle=(height?:number):CSSProperties=>height?{minHeight:clampBlockHeight(height),height:'auto',overflow:'visible',boxSizing:'border-box'}:{}
