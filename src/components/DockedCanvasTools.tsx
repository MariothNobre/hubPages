import {useContext,type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {EditorToolsContext} from './editor-tools-context'
export function DockedCanvasTools({children}:{children:ReactNode}){
 const dock=useContext(EditorToolsContext)
 if(!dock)return children
 return dock.canvas?createPortal(<details className="editor-tools-group"><summary>Ferramentas da importação</summary>{children}</details>,dock.canvas):null
}
