export interface TemplateTheme {id:string;name:string;mood:string;ink:string;primary:string;dark:string;accent:string;gold:string;paper:string;soft:string;hero:string}
export const templateThemes:TemplateTheme[]
export function templateTheme(id?:string):TemplateTheme
export function isTemplateTheme(id:unknown):boolean
export function themeVariables(id?:string):Record<string,string>
