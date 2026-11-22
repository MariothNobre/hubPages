# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota versionamento
semântico.

## [0.10.3-dev.1] - 2026-11-22 (somente DEV)

- Fundo completo de listas e caixas agrupadas, incluindo contêineres sem pintura própria.
- Modos para empurrar o conteúdo ou estender somente o fundo sem deslocar textos.
- Atalho para cobrir o grupo seguinte, com geometria responsiva, Desfazer e persistência.
- Seleção direta do grupo corrigida quando há camadas de fundo compartilhado.
## [0.10.2-dev.1] - 2026-11-22 (somente DEV)

- Cabeçalhos para arrastar e × para fechar as duas janelas de ferramentas, com suporte a toque/teclado e limites da tela.
- Fechar cores preserva o foco para continuar digitando; mover as janelas não altera o conteúdo.
- Cor de fundo da caixa inteira, com amostras, seletor personalizado, transparência, Desfazer e persistência na prévia/publicação.

## [0.10.1-dev.1] - 2026-11-22 (somente DEV)

- Completa a edição direta de caixas: excluir fundo atrás do texto, recolher ferramentas sem perder a alça, ajustar caixas/textos por bloco e retornar ao modo de texto ao fechar a seleção.
- Divide rascunhos importados antigos em seções ao abrir e preserva contêineres na inserção/exclusão de blocos; permite adicionar itens aos grupos.
- Fecha a barra de cores fora do campo de texto e remove realces do editor da prévia/publicação.
- Corrige dimensões/alinhamento da galeria, inclusive a validação do servidor que descartava estilos. Mantém dimensões originais quando não configuradas.
- Acrescenta controles contextuais de mídias usadas como fundo no CSS. Regressões de DOM, geometria, eventos, salvamento e publicação.

## [0.10.0-dev.1] - 2026-11-22 (somente DEV)

- Seleção de objetos/camadas nas importações; excluir objeto, remover fundo ou caixa preservando conteúdo, mover/redimensionar e desfazer.
- Divisão de seções semânticas, organização de importações anteriores, quantidade/visibilidade e duplicação independente de itens.
- Cor por campo de texto em templates e importações, preservando tipografia na prévia e publicação.
- Alinhamento individual de imagens, fotos e vídeos com controles abaixo da troca de mídia.
- Identificação de template/nome ou importação/URL nos cards e listagem. Sem migração ou alteração de produção.

## [0.9.1-dev.1] - 2026-11-21 (somente DEV)

- Corrige a importação de páginas com blocos `<style>` vazios: o importador deixa de solicitar um arquivo inexistente `/undefined`. Folhas de estilo externas continuam sendo copiadas e validadas normalmente.
- Preserva conteúdo estático em contêineres Astro e identificadores de CSS com escopo, sem executar componentes remotos. Impede captura vazia sem slots editáveis.
- Recursos e diretrizes reutilizáveis registrados no guia de compatibilidade tecnológica.
- Regressão automatizada para estilos vazios e teste real com `https://codigodivinochurch.site/`.

## [0.9.0-dev.1] - 2026-11-21 (somente DEV)

- Importação de uma página HTTPS pública autorizada, com assistente de sete etapas, conteúdo editável, mídias locais atuais, âncoras e seis temas de cores.
- Segundo modelo compartilhado **Sabor**, baseado na página de teste autorizada Coma Bem em Minutos, com textos e artes localizados em português brasileiro e miniaturas reais.
- Rodapé original nas importações, sem marca HubPages adicional. Exceção exclusiva para o modelo Sabor de autoria autorizada.
- Persistência, revisão obrigatória, preview, checkout/Pixel individual, duplicação, desfazer e publicação DEV integrados. Captura limitada e saneada, sem scripts ou pixels externos; produção não alterada.

## [0.8.0-dev.1] - 2026-11-21 (somente DEV)

- Modelo 01 renomeado Aurora no catálogo, com paleta Original e mais cinco combinações: Oceano, Lavanda, Bosque, Solar e Rosé.
- Card com amostras de cores e fluxo em duas etapas: escolha de paleta, prévia completa e aplicação à página atual sem substituir conteúdo.
- Tema individual por rascunho, com persistência, prévia, duplicação, desfazer, pendências e revisão antes de publicar. Original preservado nas páginas existentes; sem migração de banco.

## [0.7.1] - 2026-11-21

- Checkout: autosave aguarda URL completa sem popups repetidos; links padrão e individuais mantêm foco e digitação durante salvamento. Validação HTTPS da API preservada.

## [0.7.0] - 2026-11-21

- Promoção autorizada de todas as atualizações do Studio para produção, com origem, banco, dados, acesso e segredos próprios. Incorporação das páginas de produção e verificação de preservação; sem importar dados DEV.
- Publicação temporariamente gratuita em produção até Asaas, migração 009 aditiva, condições por ambiente e vídeos permitidos pela CSP. Pipeline main com backups/restores e rollback de aplicação.
- Botão de publicação em verde suave, bloco do link com o mesmo verde do resumo quando no ar e Alterar endereço abaixo do link.

## [0.7.0-dev.14] - 2026-11-21 (somente DEV)

- Revisão obrigatória no servidor, pendências de publicação canônicas e recuperação guiada de endereço ocupado ao voltar para a lista.
- Duplicação de blocos nativos, configurações locais, Desfazer reposicionado, salvamento automático e criação somente na lista.
- Identidade STUDIO DE CRIAÇÃO, setas na timeline, controles coral e preferência do guia por usuário (migração 008).
- Login principal /entrar, logout com cookies expirados e revogação persistente; endereços padrão com sufixos aleatórios disponíveis.
- Vídeos com autoplay/loop/áudio habilitado e fallback de interação; aviso no botão direito com copiar/colar preservado nos campos.

## [0.7.0-dev.13] - 2026-11-20 (somente DEV)

- Contrato compartilhado de edição para templates PT/ES e futuros modelos: ações sem navegar no editor, preço legível em quatro posições, FAQ corrigida, visibilidade individual de botões e quantidades configuráveis.
- Autor e degustação opcionais; metadados do leitor editáveis, substituição centralizada sem fechar o modal e três mídias independentes na pilha. Galeria da coleção de até seis imagens/vídeos com composição expandida na prévia.
- Mídias atuais por espaço, vídeo MP4/WebM com Range e limpeza de binários antigos ao republicar/despublicar, preservando a publicação atual enquanto o rascunho muda. Migração 007 e histórico JSON preservado.
- Botão Desfazer e Ctrl+Z/Cmd+Z para alterações do rascunho, incluindo mídias e blocos removidos. Até 50 ações/100 MB temporários na RAM, sem biblioteca online.
- Marca apenas no rodapé de vendas sem link, catálogo atualizado, renderizadores carregados sob demanda e diretrizes versionadas em docs/DIRETRIZES_TEMPLATES_E_EDITOR.md.

## [Não publicado]

### Adicionado

- Configuração segura do Meta Pixel e da API de Conversões no painel da página **Infância Além das Telas**, com token protegido no servidor, deduplicação por `event_id`, modo de teste e rastreamento automático quando ativado.

- Página de vendas completa da coleção **Infância Além das Telas**, com oferta de R$ 197,00 por R$ 29,90.
- Capas oficiais do manual e dos cinco bônus, otimizadas em WebP.
- Foto oficial de Marioth Nobre na seção de apresentação do autor.
- Degustação interativa com páginas reais do ebook, sem sair da página de vendas.
- CTAs recorrentes, FAQ expansível e barra fixa de compra para celular.
- Validação para aceitar somente checkout externo da Hotmart nos botões de compra.
- Modo público seguro que mantém o painel desativado quando os segredos da VPS ainda não foram provisionados.
- Provisionamento automatizado do primeiro acesso por ambiente através do gateway SSH restrito.
- Direção visual provisória para a central HubPages e a página **Infância Além das Telas**.
- Conteúdo tipado separado dos componentes React.
- Área administrativa em `/admin` para textos e links comerciais autorizados.
- Primeiro acesso com e-mail cadastrado, código de ativação de uso único e criação de senha.
- API Node.js com sessão segura, limite de tentativas, validação de origem e conteúdo.
- Volumes persistentes e secrets separados entre DEV e produção.

### Planejado

- Integração do link oficial do checkout e da entrega do ebook na Hotmart.

## [0.1.0] - 2026-11-15

### Adicionado

- Base React + TypeScript com Vite.
- Rotas da central e do primeiro ebook.
- Separação entre homologação DEV e produção no domínio raiz.
- CI para lint, tipos e build.
- Documentação operacional e de versionamento.
- Arquitetura Docker isolada para homologação e produção na VPS do Sistera.
- Limites de recursos, health checks, filesystem somente leitura e gateway de deploy restrito.
- Procedimento seguro para integrar os domínios ao Caddy somente depois do DNS.
- Plano de evolução para uma plataforma dinâmica de criação de páginas de vendas.
- Compartimentos Docker DEV e produção implantados e validados na VPS.
- Acesso de deploy restrito instalado; chave administrativa temporária revogada.

