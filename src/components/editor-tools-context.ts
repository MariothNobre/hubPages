import {createContext} from 'react'
export const EditorToolsContext=createContext<{text:HTMLDivElement|null;object:HTMLDivElement|null;canvas:HTMLDivElement|null}|null>(null)
