# Edição visual, cores e alinhamento — DEV

Disponível para homologação na versão 0.10.0-dev.1. As alterações ficam no rascunho até revisar e publicar. Não há migração ou reescrita automática das páginas existentes.

## Ajustar objetos de uma página importada

1. Abra Conteúdo e ative **Selecionar objetos**. Clique na caixa, imagem ou grupo desejado.
2. Se houver sobreposição, use **Camada selecionada** para escolher a forma de fundo ou a caixa de texto exata.
3. **Remover fundo, manter texto** limpa apenas a aparência do fundo. **Remover caixa, manter conteúdo** retira o contêiner e preserva seus filhos. **Excluir objeto** remove o elemento e seu conteúdo.
4. Arraste **↔ Mover** para reposicionar ou **↘** para redimensionar. Também é possível informar largura, altura e posições X/Y. **Ajustar caixa ao texto** libera a altura e o transbordamento. Confira o resultado nos três tamanhos da revisão.
5. Use **Desfazer** ou Ctrl+Z para reverter a alteração, inclusive remoções. A versão publicada permanece protegida até republicar.

As formas cinzas identificadas na origem são objetos SVG reais do layout. O importador não apaga indiscriminadamente fundos da página: a seleção de camadas permite remover somente o objeto indesejado.

## Blocos e itens

Novas capturas separam seções semânticas aninhadas mantendo o esqueleto do documento, cabeçalho e rodapé. Em importações anteriores, **Organizar em blocos** divide seções existentes quando a estrutura permite; essa ação pode ser desfeita. Estruturas sem seções semânticas mantêm a divisão segura disponível.

Cada bloco mantém Arrastar, Layout, Duplicar, Subir, Descer e Remover. **Itens do bloco** abre a seleção do grupo. Selecione a lista ou grupo pai e abra **Itens deste grupo** para definir a quantidade visível, ocultar itens individuais ou duplicar um item. Reduzir a quantidade preserva o conteúdo oculto no rascunho; ele não aparece na publicação. A duplicação cria identificadores e espaços de mídia independentes.

Limites atuais: 40 blocos e 70 mídias por página. Duplicações que excederiam a quota são interrompidas antes de alterar o rascunho.

## Cor de cada texto

Clique no campo de texto diretamente na página. A barra **Cor do texto** oferece cores prontas, seletor personalizado e restauração da cor original. Funciona nos modelos nativos e nas importações, inclusive títulos, descrições, preços e textos dos botões. A cor pertence ao campo, preserva a tipografia e aparece na prévia e publicação. Pode ser desfeita e invalida a confirmação de revisão.

## Alinhamento de fotos, imagens e vídeos

Os controles **Esquerda, Centro e Direita** aparecem logo abaixo de **Trocar imagem / vídeo**, centralizados sobre a mídia. O alinhamento é individual, dentro do espaço disponível no bloco, e permanece após recarregar. Reduza a largura para perceber o deslocamento de uma mídia que ocupa todo o contêiner. O alinhamento não converte o bloco inteiro nem altera mídias vizinhas.

## Identificação da origem

Cards e listagem mostram **Template · Nome** ou **Importada · endereço original**. O modelo curado Sabor é identificado como template. Uma importação comum preserva a URL de origem e não recebe marca adicional HubPages.

## Validação e operação

Testes de DOM, contrato nativo, saneamento, armazenamento, publicação, revisão e identificação de origem acompanham a implementação. Os testes de integração usam dados sintéticos e rodam também no PostgreSQL isolado do CI. Evidências locais em `docs/evidence/hp040/`.

Somente DEV recebe esta entrega. Produção e Sistera permanecem preservados; o app DEV mantém o limite de 2 GiB. Este recurso não executa código remoto nem reduz as proteções de rede do importador.

## Complementação após auditoria — HP-042 / 0.10.1-dev.1

A entrega anterior tinha recursos parciais. A conferência solicitada pelo proprietário identificou e corrigiu:

1. **Caixas de fundo:** a seleção exigia ativar um modo separado e a remoção do fundo do texto não alcançava formas SVG independentes. Agora clicar no texto ou na forma mostra a seleção; **Excluir caixa de fundo** retira a forma sobreposta mais próxima, preservando o texto. A ação fica também na seleção sobre a página.
2. **Redimensionamento:** a janela lateral podia cobrir a alça e a largura ficava limitada ao contêiner antigo. **Recolher ferramentas** preserva a seleção e libera a alça; largura/altura e arraste continuam disponíveis. A largura admite ajuste até o limite da janela. Fechar a seleção retorna à edição de textos.
3. **Textos fora de caixas:** **Ajustar caixas e textos** fica em cada bloco e **Ajustar caixas desta página** aplica o ajuste ao conjunto. As caixas de texto recebem altura conforme o conteúdo e fundos grandes que interceptam o texto são ampliados quando necessário. Não apaga formas decorativas automaticamente. Layouts livres ainda permitem ajuste manual pela alça e posição; confira a revisão responsiva.
4. **Importações antigas:** se houver seções semânticas dentro de um bloco gigante, o editor divide o rascunho ao abri-lo, com Desfazer e sem alterar a publicação existente. Inserir/remover blocos mantém os slots nos contêineres aninhados, evitando deslocar conteúdo para outra estrutura.
5. **Cores contextuais:** a barra só abre ao entrar no campo editável. Clicar fora, focar outro controle ou Escape fecha a barra. Interagir com a própria barra mantém a escolha. Edição de objetos não é edição de texto.
6. **Itens de grupos:** além de ocultar/restaurar quantidades existentes, há **Adicionar item ao grupo**, também para grupos com um item. A cópia usa identificadores próprios e, em grades de builders com linhas explícitas, vai para linhas livres, evitando sobreposição total.
7. **Galeria da coleção:** o CSS impedia o efeito das dimensões e o servidor descartava o estilo individual. Agora largura, altura, encaixe e alinhamento persistem e aparecem na edição/prévia/publicação. Só configurações explícitas alteram as dimensões; alinhar não inventa altura/largura. A composição original em leque permanece por padrão.
8. **Mídias de fundo:** imagens referenciadas no CSS recebem controles no próprio bloco para trocar, dimensionar e alinhar. São identificadas por referências locais capturadas e seletores CSS, sem executar scripts remotos. A lista de mídias permanece disponível como alternativa para estilos não associáveis a um elemento.

Todos os ajustes de conteúdo usam o Desfazer e ficam no rascunho até revisão/publicação. Os testes usam dados sintéticos. Evidências em `docs/evidence/hp042/`; publicação do sistema exclusivamente DEV, sem migração de banco.

## Janelas móveis e fundo da caixa — HP-044 / 0.10.2-dev.1

- As janelas **Caixas e objetos** e **Cores do texto** têm cabeçalho **Arraste para mover** e botão **×** sempre acessível no topo. Arraste pelo cabeçalho com mouse/toque; com o cabeçalho selecionado, as setas movem a janela. Os limites da tela são respeitados, inclusive após redimensionar a janela do navegador.
- O × da janela de objetos recolhe as ferramentas e mantém a seleção da caixa. O botão Ferramentas da caixa permite reabrir. O × das cores fecha a barra preservando o foco do campo para continuar digitando. Clicar fora continua fechando a barra contextual.
- A posição é mantida na memória da sessão do editor ao reabrir a ferramenta. Mover/recolher janelas não altera o conteúdo, a publicação nem gera ações de Desfazer.
- Em **Fundo da caixa selecionada**, escolha uma amostra ou uma cor personalizada. A cor cobre a caixa inteira, incluindo seus vários parágrafos/listas. Não muda textos, cores das letras, dimensões ou posição. **Transparente** remove o preenchimento; Desfazer restaura a alteração anterior.
- Para alcançar um grupo maior, use Camada selecionada ou Selecionar caixa/grupo pai. A alteração é da caixa selecionada, não da página inteira. O preenchimento fica no rascunho e aparece na prévia; a página pública recebe a mudança após revisão/publicação.
- QA sintético em docs/evidence/hp044: ambas as janelas movidas, fechadas, digitação continuada com a barra fechada; fundo verde escuro na caixa de vários textos brancos, Undo, F5 e prévia; limites em 390×844. Nenhuma edição/publicação de página real durante os testes.

## Fundo completo e crescimento independente — HP-046 / 0.10.3-dev.1

1. Clique no texto da lista e use Selecionar caixa ou lista completa. Escolha Fundo da caixa selecionada para pintar todos os textos do grupo. Contêineres sem pintura própria passam a comportar seus parágrafos, mantendo o conteúdo.
2. Em Como aumentar esta caixa?, escolha Empurrar conteúdo abaixo para redimensionar no fluxo normal ou Estender apenas o fundo, sem empurrar para preservar a posição das caixas seguintes.
3. Cobrir próxima caixa com este fundo estende o preenchimento até o final do grupo seguinte no mesmo bloco e acompanha mudanças de tela. Desvincular próxima caixa devolve o controle manual. Não é necessário mover a lista para dentro do título.
4. Desfazer restaura a alteração. F5 mantém o fundo e seu vínculo. Confira a prévia e publique após a revisão; a página pública existente só muda ao publicar. Duplicar blocos remapeia vínculos internos; cópias isoladas não referenciam a caixa original.

QA em docs/evidence/hp046: lista real com 13 elementos, fundo completo, F5, Undo, desktop e 390×844. Testes usam páginas sintéticas, sem editar conta real. Publicação do sistema somente DEV.

## Altura vertical dos blocos — HP-048 / 0.11.0

No rodapé de cada bloco em Conteúdo, use ↕ Altura: arraste para cima/baixo ou use as setas do teclado. Também pode informar pixels; Automática (0) devolve a altura natural. Layout do bloco oferece o mesmo ajuste. A altura é mínima para preservar o conteúdo quando o texto quebra linhas no celular; reduzir não recorta textos/imagens. Blocos de origem com grades internas continuam respeitando as dimensões dos seus elementos: ajuste também as caixas internas quando necessário.

O gesto salva ao soltar e gera uma ação de Desfazer. O campo segue o salvamento automático. O valor é preservado no F5, na duplicação e na prévia; a página no ar só muda ao publicar após revisar. Controles não aparecem no site publicado. Aplicação comum aos templates PT/ES, blocos adicionais e importados; nenhum valor é imposto a páginas existentes.

## Coluna única de ferramentas — HP-062

O editor reúne Layout, Botões/links, Cards/recursos, Adicionar, Caixas/objetos e Cores em uma coluna à direita. A seleção no canvas atualiza o contexto. Cores só aparecem ao editar um texto; objetos importados mostram suas próprias camadas, fundo, dimensões, posição e itens na mesma coluna. Selecione outro bloco para mudar o contexto. Recursos gerais da página continuam disponíveis no grupo Cards e recursos.

Use × para recolher a coluna; a aba lateral Ferramentas permanece disponível para reabrir. A seleção, o canvas e os controles permanecem montados. Recolher/abrir não salva mudanças no conteúdo nem adiciona ações ao Desfazer. No desktop a coluna tem espaço próprio; em telas estreitas fica sobreposta à direita e pode ser recolhida para liberar o canvas. Desfazer fica acessível na parte superior, e cada grupo tem seu próprio recolhimento.

As antigas janelas de objetos e cores são encaminhadas à coluna pelo contexto do editor; a alteração não modifica dados, estilos publicados, uploads, checkout ou publicação. Controles inline de mover/redimensionar continuam junto aos objetos. O recurso serve tanto aos modelos quanto às importações.
