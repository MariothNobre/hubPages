import {createContext,useContext} from 'react'
export const TextColorContext=createContext<{colors:Record<string,string>;select:(key:string,label:string)=>void}>({colors:{},select:()=>{}})
export function useTextColor(key?:string){const context=useContext(TextColorContext);return{color:key?context.colors[key]:undefined,select:(label:string)=>{if(key)context.select(key,label)}}}
