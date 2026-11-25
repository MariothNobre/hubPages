export type GoldPlan={name:string;amountCents:number;version:number;currency:string;cycle:string;environment:string}
export type GoldStatus={enabled:boolean;termsVersion:string;plan:GoldPlan;access:{allowed:boolean;reason:string;state:string;validUntil:string|null};order:{amountCents:number;planVersion:number;phase:string;invoiceUrl:string|null;paymentStatus:string|null}|null}
export const goldMoney=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100)
