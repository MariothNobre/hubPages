import type {Draft,MediaItem} from '../src/components/studio-model'
export function importedPaletteVariables(palette:Record<string,string>,themeId?:string):Record<string,string>
export function activeImportedAssets(draft:Draft):MediaItem[]|undefined
export function importedThemeName(modelName:string,theme?:string):string

export function activeImportedButtons(draft:Draft):Draft['templateButtons']
