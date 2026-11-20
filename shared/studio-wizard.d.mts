import type { Draft } from '../src/components/studio-model'
export interface PendingChange {id:string;label:string;detail:string}
export function pendingChanges(draft:Draft,published:Draft|null,changedImageSlots?:string[]):PendingChange[]
export function reviewSignature(draft:Draft,assetVersion?:string):string

export function wizardReadiness(draft:Draft,origin:string,reviewed:boolean,published:boolean,pending:number):boolean[]
