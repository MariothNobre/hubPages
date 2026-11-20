# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota versionamento
semântico.

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
