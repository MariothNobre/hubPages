# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota versionamento
semântico.

## [Não publicado]

### Adicionado

- Direção visual provisória para a central HubPages e a página **Infância Além das Telas**.
- Conteúdo tipado separado dos componentes React.
- Área administrativa em `/admin` para textos e links comerciais autorizados.
- Primeiro acesso com e-mail cadastrado, código de ativação de uso único e criação de senha.
- API Node.js com sessão segura, limite de tentativas, validação de origem e conteúdo.
- Volumes persistentes e secrets separados entre DEV e produção.

### Planejado

- Design definitivo da central HubPages.
- Red Line, oferta e CTAs da página **Infância Além das Telas**.
- Integração do checkout e da entrega do ebook.

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
