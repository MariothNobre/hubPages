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
