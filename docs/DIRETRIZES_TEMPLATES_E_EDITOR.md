# Contrato dos templates e do editor HubPages

Aplicável a todos os novos templates e às derivações do modelo Infância em português e espanhol. Implementação inicial: HP-025, somente DEV.

## Edição e publicação

- Toda edição acontece no canvas. Textos, títulos, preços, rótulos e metadados da degustação são editáveis no próprio contexto.
- O editor nunca navega para um checkout. Use `EditorAction`: elemento editável sem href, controle individual Exibido/Oculto e seleção do botão correto. Links funcionam na prévia privada e na publicação.
- Elementos desabilitados continuam disponíveis na edição e ficam ausentes no HTML público. Autor e degustação têm controles globais; cada botão tem sua própria visibilidade.
- Preserve o layout aprovado por padrão. Quantidades, ordem, estilo e conteúdos só mudam quando o usuário configura. O cabeçalho de vendas não mostra a marca da plataforma; nos modelos de autoria HubPages, o rodapé mostra a logo sem link e com tooltip **Feito com HubPages.com.br**.
- Isole estilos do editor. Preços devem herdar a tipografia correta, inclusive a moeda e a barra móvel. Nunca aplique a rotação do ícone de FAQ ao título editável. Ícones de navegação/fechar/expandir são controles, não campos de texto.

## Mídias e armazenamento

- Use `CanvasMedia` para imagem/foto/vídeo com controle de substituição centralizado, redimensionamento e upload por espaço. Miniaturas são somente leitura, sem botões aninhados.
- PNG/JPEG/WebP de entrada até 10 MB e 40 MP; imagem otimizada até 2 MB. Vídeo MP4/WebM até 25 MB, com controles nativos, reprodução inline e HTTP Range. Limite de mídias atuais de 100 MB por conta no rascunho e 100 MB nas publicações atuais.
- Uma mídia atual por slot, sem biblioteca de arquivos anteriores. Uma capa pode ser reutilizada pelo bônus e pela composição da coleção sem duplicação do arquivo.
- Uma publicação mantém sua cópia atual enquanto o rascunho muda. Ao republicar, retirar do ar ou mover para a lixeira, os binários de publicações antigas dessa página são removidos. Documentos JSON e revisões técnicas permanecem imutáveis; backups seguem a retenção operacional existente.
- A galeria da coleção usa `StudioMediaGallery`, de zero a **seis** mídias. Na edição, todas aparecem separadas com controles próprios; no site, o layout distribui as capas ao redor da principal. A pilha da degustação também expõe suas três mídias separadamente na edição.

## Cards, degustação e desfazer

- `StudioStructure` controla quantidades do método, conteúdo, bônus e degustação (0–20, respeitando até 40 blocos por página). Reduzir oculta excedentes, preservando o conteúdo. O título padrão de bônus e a contagem de páginas acompanham a quantidade exibida.
- O leitor permanece na página. Origem, título, descrição e chamada adicional do modelo espanhol são editáveis. Trocar mídia mantém o leitor aberto; miniaturas e setas continuam funcionando.
- O botão **Desfazer**, no cabeçalho, restaura alterações do rascunho da sessão: textos, links, preços, estilos, ordem, visibilidade, quantidades, mídias e blocos removidos. Navegar nas etapas não cria ações de desfazer.
- Ctrl+Z/Cmd+Z aciona o desfazer geral fora de campos; dentro de textos/campos permanece o desfazer nativo da digitação. A restauração geral é salva automaticamente, sem publicar alterações.
- Até 50 ações e 100 MB de mídias temporárias na memória da aba. O histórico termina ao fechar/recarregar/trocar de página; não é uma biblioteca online. Publicar/despublicar, excluir uma página inteira e salvar credenciais separadas são ações operacionais, não alterações do canvas.

## Como implementar e validar um template

1. Registrar dados padrão com IDs estáveis, papéis semânticos, slots próprios e valores editáveis. Não substituir chaves de texto existentes em migrações.
2. Usar os componentes compartilhados de ação, mídia, galeria, estrutura e atribuição. Carregar renderizadores sob demanda para manter o Studio leve.
3. Cobrir edição sem navegação, visibilidade pública/editor, preço em todas as posições, counts, galeria máxima, metadados e mídia em `test-editor-contract.cjs`.
4. Validar persistência, propriedade, publicação atômica, Range e limpeza de binários em arquivo e PostgreSQL isolado (`test-workspace.mjs`). Validar desfazer com mídia e exclusão em `test-studio-undo.cjs` e no navegador.
5. Conferir desktop/celular, FAQ, três mídias da pilha, seis da galeria, troca dentro do leitor e prévia privada. Versionar evidências sem tokens nem conteúdo privado.
6. Executar lint, build, geração determinística e preservação das páginas legadas. Implementar/deploy em develop/DEV; produção só após aprovação específica.


## Refinamentos obrigatórios do fluxo — HP-027

Todo template deve oferecer duplicação por bloco com identificador próprio e estrutura nativa preservada, controles locais de layout/quantidades e cores dos controles do Studio separadas das cores da página de vendas. Cópias usam textos próprios e IDs HTML distintos. A origem das cópias aceita somente papéis conhecidos; referências recursivas são rejeitadas.

Vídeos de apresentação usam autoplay/loop com som habilitado e um botão de interação se o navegador bloquear a reprodução. Não silenciar automaticamente para contornar a escolha do usuário. Miniaturas permanecem sem autoplay.

A publicação exige assinatura de revisão atual, validada no servidor junto da versão das mídias. A assinatura ignora navegação entre etapas e metadados da própria conferência. A comparação da publicação trata URLs canônicas como equivalentes.


Todo campo de checkout deve usar CheckoutLinkInput e o preflight compartilhado checkoutLinkProblem: orientação discreta durante digitação, sem popup automático por URL incompleta, buffer de foco para preservar cursor e validação HTTPS estrita antes de persistir. Links incompletos ficam no editor aberto até serem corrigidos.


## Temas de cores por modelo — Aurora

Registrar paletas com IDs estáveis em shared/template-themes.mjs. Persistir somente a escolha na própria página; seleção exploratória na janela não altera o rascunho. Usar o mesmo renderizador na prévia/edição/publicação, preservar o original quando ausente e incluir a escolha na revisão e nas pendências. Não usar filtros sobre fotografias para simular paletas. Manter textos e mídias ao trocar apenas cores. Novos modelos devem registrar suas próprias paletas compatíveis, respeitar contraste e reduced-motion e validar IDs na API.


## Importações — HP-036

- A importação preserva o rodapé e as informações da origem. Não acrescenta logo, atribuição ou link HubPages. A autoria é preservada no servidor; editar o rascunho não pode transformar uma importação comum em modelo de autoria HubPages.
- Única exceção autorizada: o modelo **Sabor**, preparado a partir de `https://comericoenminutos.online/`, página de autoria do proprietário. Somente essa derivação curada permite a marca HubPages no rodapé, sem link. Uma importação comum até desse mesmo endereço continua sem a marca adicional.
- Capturar somente o documento solicitado e seus recursos visuais. Preservar âncoras; não seguir links de navegação, executar scripts da origem ou copiar seus pixels. Destinos de compra originais ficam disponíveis para consulta/adoção explícita. Cada página mantém seu checkout e suas credenciais Meta.
- Usar `ImportedCanvas`: HTML e CSS saneados em Shadow DOM, textos editáveis no contexto, controles de mídia centralizados, seções ordenáveis/duplicáveis/removíveis e desfazer. Formulários não submetem à origem; widgets dependentes de scripts próprios podem precisar de reconstrução. Essa restrição deve ser explicada antes da captura.
- Seis temas por importação: cores originais + cinco combinações HubPages; nomes automáticos `Nome do modelo · Nome da paleta`. A paleta altera cores de HTML/CSS, não os pixels das fotos e capas.
- Mídias importadas pertencem ao espaço atual da página. Ao substituir/remover, aplicar a mesma limpeza e proteção da publicação já existente. Assets fixos do catálogo são recursos compartilhados do modelo, não biblioteca pessoal de uploads antigos.
- Captura: HTTPS público, DNS e redirecionamentos verificados, 2 MB de HTML, 8 MB por recurso, 45 MB totais, até 70 mídias/40 seções/40 folhas CSS. Uma captura global por vez, uma tentativa por minuto por conta, prazo de 45 s na API. Sem buscas recursivas por outras páginas.

## Compatibilidade tecnológica reutilizável

- Para toda importação futura, aplicar o catálogo de padrões em [IMPORTACAO_COMPATIBILIDADE_TECNOLOGICA.md](IMPORTACAO_COMPATIBILIDADE_TECNOLOGICA.md).
- Estilos inline vazios não são URLs externas. Wrappers Astro com HTML no servidor devem preservar filhos por meio de contêineres inertes. Identificadores CSS `data-v-*`/`data-astro-cid-*` precisam de allowlist limitada, sem transportar código ou props.
- Uma captura só é considerada válida depois de conferir slots editáveis e conteúdo visível no Studio, inclusive após recarregar. Corrigir por padrão tecnológico, com fixture offline e regressão, sem condicionais por domínio.

## Edição de objetos e campos — HP-040

Consultar [EDICAO_VISUAL_E_CORES.md](EDICAO_VISUAL_E_CORES.md). Seções semânticas aninhadas passam a blocos sem perder o scaffold. Marcadores internos limitados identificam objetos, visibilidade e remoção de fundo; não liberam scripts ou atributos arbitrários. Textos usam identificadores estáveis e cores hexadecimais validadas; os spans de cor herdam tipografia para não reduzir preços. Mídias persistem alinhamento por espaço. Dimensões e deslocamento preservam o transform original. Duplicações remapeiam objetos, textos, botões e mídias para manter edição independente. Testes offline em test-page-import.mjs e test-import-editor.cjs; persistência/publicação em test-workspace.mjs, arquivo e PostgreSQL CI.
