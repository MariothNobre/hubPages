import type { Draft } from '../src/components/studio-model'
export function validCheckoutLink(value:string,allowAnchor?:boolean):boolean
export function checkoutLinkProblem(draft:Pick<Draft,'checkoutUrl'|'templateButtons'|'blocks'>):{label:string;step:number}|null
