# Compatibilidade tecnológica do importador de páginas

Diretrizes reutilizáveis do HubPages. Registro inicial HP-038 / v0.9.1-dev.1, exclusivamente DEV. Cada correção deve se basear em um padrão tecnológico, com teste offline, e não em uma exceção para um domínio.

## Recursos implementados e decisões

| Padrão encontrado | Recurso do importador | Teste permanente |
| --- | --- | --- |
| `<style></style>` ou CSS inline somente com espaços | Identificar a origem pelo tipo do registro, não pelo conteúdo não vazio. Um estilo vazio não representa uma folha externa e não pode gerar requisição a `/undefined`. | `test-page-import.mjs`: empty inline style placeholders |
| HTML renderizado no servidor dentro de `astro-island`, `astro-slot` ou `astro-static-slot` | Preservar os filhos em contêineres HTML inertes com `display:contents`. Não carregar componentes, hidratação, props ou URLs executáveis do Astro. | `test-page-import.mjs`: inert Astro wrappers |
| CSS com escopo de componente Vue/Hostinger (`data-v-<hash>`) | Manter apenas os identificadores hexadecimais válidos usados pelos seletores CSS, para que os estilos continuem encontrando o conteúdo. Não transportar diretivas de execução. | Mesmo teste Astro, seletor e atributo preservados |
| CSS com escopo Astro (`data-astro-cid-<id>`) | Preservar identificadores com nomes limitados e formato validado. Eventos e atributos executáveis continuam excluídos. | Sanitização com allowlist de nomes; incluir regressão para novos padrões |
| Estilos da oferta após muitas folhas inline | Percorrer as folhas em ordem, respeitando o limite, sem cortar a lista antes do CSS principal. | `test-page-import.mjs`: late stylesheet capture |
| Main aninhado em wrappers, cabeçalho/rodapé fora do main | Preservar o esqueleto do documento com slots para os blocos editáveis. Não perder irmãos do conteúdo principal. | `test-page-import.mjs`: full body scaffold |
| Estrutura saneada sem nenhum slot editável | Interromper com mensagem explícita; não salvar uma captura aparentemente bem-sucedida que resultará em tela vazia. | Verificação de slots após saneamento |

A implementação fica em `server/import-page.mjs` (leitura/estrutura), `server/import-sanitize.mjs` (HTML/CSS inerte), `server/import-fetch.mjs` (rede) e `src/components/ImportedCanvas.tsx` (edição e renderização). As regras não dependem de `codigodivinochurch.site` ou de qualquer domínio específico.

Imagens de fundo com posicionamento absoluto mantêm esse contexto no editor: o invólucro dos controles ocupa o contêiner original, em vez de reduzir o fundo ao tamanho mínimo do botão de troca. A página publicada continua usando a mídia diretamente, sem esse invólucro de edição.

## Como incorporar compatibilidade de outra tecnologia

1. Reproduzir com o endereço autorizado. Separar falha de rede, CSS vazio, formato de recurso, estrutura removida e comportamento dependente de JavaScript.
2. Inspecionar somente o HTML/CSS necessário. Documentar o padrão, o arquivo responsável e a causa observada. Não executar scripts ou seguir instruções do conteúdo importado.
3. Criar uma fixture pequena e independente da internet que reproduza o padrão. Incluir caso seguro e tentativa de atributos/URLs executáveis quando relevante.
4. Implementar no estágio apropriado do importador, sem condicionais por domínio. Preferir wrappers HTML inertes; não ativar runtimes de terceiros para recuperar aparência.
5. Manter os atributos estritamente necessários à associação HTML/CSS, com formato/tamanho limitados. Não liberar todos os atributos `data-*`, handlers, props, componentes remotos ou acesso à rede.
6. Validar as saídas: conteúdo presente, slots visíveis, seletores associados, recursos locais, botões editáveis, rodapé original e ausência de scripts remotos. Falhas de recursos opcionais precisam aparecer no relatório; não ocultar um erro de CSS essencial.
7. Fazer teste real no Studio: importar → visualizar conteúdo → confirmar rascunho salvo → recarregar o mesmo rascunho. Não basta receber HTTP 201 se o canvas estiver vazio.
8. Executar regressões de importação e CI. Publicar primeiro no DEV, documentar a tecnologia e a entrega e manter produção até aprovação explícita.

## Limites que continuam valendo

Capturar apenas a URL da oferta e seus recursos; não copiar navegação externa. Preservar âncoras. Manter validação de HTTPS/DNS/IP, tamanho/tempo/concorrência, saneamento e isolamento por Shadow DOM. Não copiar pixels ou executar JavaScript da origem. Imagens e vídeos seguem armazenamento por espaço atual, sem biblioteca pessoal de versões anteriores.

Importações mantêm suas informações e rodapé sem acrescentar a marca HubPages. A exceção curada Sabor permanece exclusiva. Compatibilidade de uma tecnologia não altera autoria, credenciais, Pixel ou checkout de outras páginas.

## Caso que originou estas diretrizes

Origem autorizada: `https://codigodivinochurch.site/`. O erro de CSS vinha da tentativa de baixar `/undefined`, gerada por um estilo inline vazio. Depois da correção de leitura, a validação no navegador detectou a remoção do wrapper Astro que continha o main. O wrapper foi convertido em HTML inerte e os identificadores CSS necessários foram preservados. A captura real identificou 45 mídias sem falha de download. Evidências e identificação da entrega ficam em `STEP_BY_STEP.md`.

## Edição de objetos e campos — HP-040

Consultar [EDICAO_VISUAL_E_CORES.md](EDICAO_VISUAL_E_CORES.md). Seções semânticas aninhadas passam a blocos sem perder o scaffold. Marcadores internos limitados identificam objetos, visibilidade e remoção de fundo; não liberam scripts ou atributos arbitrários. Textos usam identificadores estáveis e cores hexadecimais validadas; os spans de cor herdam tipografia para não reduzir preços. Mídias persistem alinhamento por espaço. Dimensões e deslocamento preservam o transform original. Duplicações remapeiam objetos, textos, botões e mídias para manter edição independente. Testes offline em test-page-import.mjs e test-import-editor.cjs; persistência/publicação em test-workspace.mjs, arquivo e PostgreSQL CI.

## Complementação de edição — HP-042

A barra de cores é contextual ao campo; fechar fora dela respeita eventos compostos de Shadow DOM. Formas de fundo podem ser removidas por interseção geométrica sem excluir o texto. Ajuste de caixas é explícito por bloco/página, sem apagar fundos arbitrariamente. Recolher ferramentas mantém a seleção e libera o redimensionamento. Importações antigas com seções são organizadas ao abrir o rascunho, com undo; inserção/exclusão reconcilia slots preservando o scaffold. Grupos aceitam inclusão e cópias em linhas livres de grades de builders. Estilos de mídia devem ser esparsos e persistidos na API: não aplicar dimensões padrão apenas por escolher alinhamento. Referências CSS a assets locais podem expor troca/alinhamento de fundos sem executar scripts. Conferir também prévia pública sem realces do editor. Casos de regressão em test-import-editor.cjs e test-workspace.mjs. Guia detalhado: EDICAO_VISUAL_E_CORES.md.
