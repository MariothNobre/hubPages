// Stable theme IDs are stored in each draft, never in account-wide settings.
export const templateThemes = [
  {id:'original',name:'Original',mood:'Verde, coral e acolhimento',ink:'#183f3a',primary:'#1f5a55',dark:'#123f3b',accent:'#dc7456',gold:'#f6bd3f',paper:'#fff8e9',soft:'#dfe9d5',hero:'#eef2df'},
  {id:'oceano',name:'Oceano',mood:'Azul profundo e brisa turquesa',ink:'#16374d',primary:'#195b78',dark:'#10394f',accent:'#116b70',gold:'#9fe4db',paper:'#f5fbff',soft:'#dcedf5',hero:'#e6f3fa'},
  {id:'lavanda',name:'Lavanda',mood:'Violeta, lilás e luz dourada',ink:'#3d2b50',primary:'#664783',dark:'#382448',accent:'#804270',gold:'#f3d68b',paper:'#fcf8ff',soft:'#e9ddf2',hero:'#f0e7f6'},
  {id:'bosque',name:'Bosque',mood:'Verde floresta e terracota',ink:'#273e30',primary:'#3d6248',dark:'#243c2c',accent:'#a74b32',gold:'#efcf89',paper:'#fafbf3',soft:'#e0e8d4',hero:'#ebefdf'},
  {id:'solar',name:'Solar',mood:'Vinho, areia e energia âmbar',ink:'#4b2c2b',primary:'#874335',dark:'#492726',accent:'#a33d29',gold:'#f5d17b',paper:'#fffaf2',soft:'#f6e6cd',hero:'#fbecd7'},
  {id:'rose',name:'Rosé',mood:'Rosa delicado e ameixa',ink:'#4a2c3c',primary:'#81435f',dark:'#472637',accent:'#9c3e5d',gold:'#f7d6b5',paper:'#fff8fa',soft:'#f1dde6',hero:'#f8e7ee'},
]
export const templateTheme = id => templateThemes.find(theme=>theme.id===id)||templateThemes[0]
export const isTemplateTheme = id => templateThemes.some(theme=>theme.id===id)
export function themeVariables(id){const theme=templateTheme(id);return Object.fromEntries(['ink','primary','dark','accent','gold','paper','soft','hero'].map(key=>['--theme-'+key,theme[key]]))}
