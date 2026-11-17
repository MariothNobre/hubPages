# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota versionamento
semântico.

## [Não publicado]

### Adicionado

- Configuração segura do Meta Pixel e da API de Conversões no painel da página **Infância Além das Telas**, com token protegido no servidor, deduplicação por `event_id`, modo de teste e consentimento prévio do visitante.

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
