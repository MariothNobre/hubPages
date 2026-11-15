# Evolução para uma plataforma dinâmica

## Visão

A primeira fase entrega uma central React com páginas versionadas em código. A arquitetura preserva um caminho de
evolução para um sistema no qual novas páginas de vendas sejam criadas e publicadas por um painel.

## Fases sugeridas

### Fase 1 — Site e páginas versionadas

- Componentes de conversão reutilizáveis.
- Rotas por slug.
- Checkout e métricas configurados por produto.
- Promoção DEV → produção por pull request.

### Fase 2 — Catálogo estruturado

- Definição de um schema de produto e página.
- Conteúdo em arquivos tipados ou CMS, sem duplicar layout.
- Preview no DEV antes de publicar.

### Fase 3 — Editor dinâmico

- API TypeScript separada do frontend.
- PostgreSQL exclusivo da HubPages em rede interna própria.
- Autenticação administrativa e trilha de auditoria.
- Versionamento de páginas, rascunho, aprovação e publicação.

### Fase 4 — Plataforma

- Biblioteca de blocos de vendas.
- Templates, testes A/B, analytics e domínios personalizados.
- Filas para publicações e integrações.
- Backups, restauração ensaiada e observabilidade dedicados.

## Regra de isolamento futura

Banco, volumes, secrets, redes internas, backups e jobs da HubPages continuarão independentes do Sistera. Apenas
o proxy de entrada e a VPS física serão compartilhados enquanto houver capacidade e margem operacional.
