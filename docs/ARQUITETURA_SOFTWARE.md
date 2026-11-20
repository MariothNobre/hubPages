# Arquitetura real e evolução HubPages

## Baseline operacional — 2026-11-20 01:11 UTC / 2026-11-19 22:11 BRT

Repositório: MariothNobre/hubPages. Base preservada: `ca0574981d787323dd5e20ddefc2a07ba1906f2f`, tag v0.6.0. Produção nesta revisão coincide com a execução Actions 44610509023 (sucesso). Branch de trabalho: `codex/feature/plataforma-dev`. Produção não autorizada para esta evolução.

### Inventário encontrado

| Área | Estado real | Evidência / preservação |
| --- | --- | --- |
| Institucional | Implementado React | `src/pages/HubPagesHome.tsx`, conteúdo estático em `siteContent.ts` |
| Páginas comerciais | Duas páginas legadas PT/ES, componentes próprios | `InfanciaAlemDasTelas*.tsx`; textos configuráveis via API |
| Rotas | `/`, `/admin`, duas rotas legadas e endereços configurados | `App.tsx`, `SalesPageRoute.tsx`, `server/page-address.mjs` |
| Conta existente | Um administrador, perfil/e-mail/senha; sem RBAC multiusuário | `store.admin`, scrypt; não alterar nem criar admin padrão |
| Auth | Cookie HttpOnly/Secure/SameSite=Strict, HMAC, 8h, limitação de login | `server/index.mjs`; segredo por ambiente |
| Meta | ID e enabled públicos; token CAPI privado; PageView e event_id compartilhado | `MetaPixel.tsx`, `/api/meta/events`; não inicializar um segundo pixel |
| Online | UUID localStorage, presença 15s, janela 45s, painel 10s | `AnalyticsTracker.tsx`, `/api/analytics/visit`, `/api/admin/analytics` |
| Contadores | Totais por página em JSONB, online em memória | Online reinicia com processo; não inventar histórico |
| Marca | Componente Brand + estilos existentes; favicons em public | Não redesenhar; preservar hashes de assets e componentes |
| Checkout | URLs Hotmart distintas PT/ES | Produção confirmou hosts pay.hotmart.com e pixels enabled nas duas páginas |
| Persistência | PostgreSQL 17, tabela `hubpages_state(id,payload,updated_at)` | Toda a configuração legada em uma linha JSONB; não converter destrutivamente |
| Runtime | Node ESM JavaScript + React/TypeScript/Vite | Preservar backend existente; novos módulos separados, sem reescrita NestJS imediata |
| CI | pnpm lint/build; scripts de integração locais | Acrescentar regressão e isolamento em CI |
| Backups | Scripts pg_dump e cópia JSON, diretório /opt/hubpages-backups/{dev,prod} | Execução atual/restore ainda não verificados diretamente nesta auditoria |

### Infraestrutura encontrada

Hostinger confirmou VPS 1964286, 179.199.148.219, Ubuntu 24.04, running, 2 vCPU / 8 GB RAM. A VPS é compartilhada com Sistera; não modificar proxy/firewall/DNS ou seus serviços.

Configuração versionada: projetos Compose `hubpages_dev` e `hubpages_prod`; apps porta interna 8080, sem publicação direta no host. Rede de proxy externa `sistera_vps_sistera_internal`. Bancos em redes internas exclusivas `hubpages_{dev,prod}_hubpages_database`, volumes `hubpages_{dev,prod}_hubpages_postgres`. Conteúdo legado em `hubpages_{dev,prod}_content`. Apps limitados a 128 MB / 0,25 CPU; PostgreSQL a 256 MB / 0,25 CPU. Segredos em `/opt/hubpages-secrets`, fora do Git. Nomes e limites extraídos do Compose; inspeção Docker direta atual não disponível nesta auditoria.

### APIs existentes

`GET /health.json`, `GET /api/resolve-page`, `GET /api/pages/:slug`, `POST /api/meta/events`, `POST /api/analytics/visit`, APIs administrativas session/setup-status/activate/login/profile/pages/analytics. Escritas autenticadas e com origem autorizada; fila de API serial no processo. Modelo atual não é multi-tenant; não abrir cadastro público antes de isolar contas e sessões no servidor.

### Diferenças DEV/produção verificadas sem escrita

Produção: health ok, needsSetup false, duas páginas com Pixel enabled e checkout Hotmart. DEV: health ok, needsSetup false, página portuguesa retorna 404 na API pública (não inferir exclusão: pode estar em rascunho); ES publicada com URL de produção, Pixel desativado/sem ID e checkout âncora. Não copiar dados de um ambiente para outro automaticamente.

### P0 e lacunas

P0: login/admin existente, páginas/URLs/ativos, marca, checkout, Meta/CAPI sem duplicidade, visitantes online, publicação/rascunho, preservação de estado JSONB. Testes atuais de auth/perfil/rascunho e endereços passaram no baseline local isolado. Login manual com credencial real, logs de aplicação atuais, inventário de registros privados, configuração DNS atual e restauração real: **não localizado no ambiente acessível** nesta auditoria, não presumir inexistência.

## Plano de evolução e critérios

1. Proteção: baseline verificável, CI, governança, deploy DEV explícito; backup e restore isolado antes de migrar dados reais.
2. Compatibilidade: conservar APIs/tabela/credenciais legadas; novos recursos com namespace próprio e feature flag DEV. Novas páginas são rascunhos privados; legado recebe isenção de cobrança inicial para preservar publicações.
3. Studio: central, templates nativos, oito etapas persistidas, blocos, revisões e preview privado. Começar pelo administrador atual; não apresentar como cadastro multi-tenant pronto.
4. Tenants: entidades accounts/users/memberships com IDs estáveis e autorização por recurso no backend; migração aditiva, sem mover credenciais até regressão/restore aprovados.
5. Publisher: artefato imutável distinto de rascunho, histórico, domínio verificado e origem imutável. Importadas jamais publicáveis na HubPages.
6. Cobrança: provedor pendente de escolha/credenciais. Sem confirmação idônea não publicar novas páginas. Não simular Pix/cartão, receita ou Purchase. Renovação antecipada: acrescentar 30 dias a max(agora,vencimento); webhooks idempotentes; estorno/chargeback suspendem acesso público preservando dados.
7. Analytics: manter legado e adicionar cliques/GA4/Ads por página, sem tratar clique como compra; privacidade configurável sem alterar legado automaticamente.
8. Importação autorizada com termos/evidências, SSRF e moderação; só após domínio/publicador/tenants testados.
9. E2E, carga e restauração; produção somente após nova aprovação explícita.

## Recuperação e aprovação

RPO alvo: 24h para backups periódicos e snapshot imediatamente anterior a cada migração. RTO alvo: 60 minutos, ainda não medido. Antes de migrar: pg_dump consistente em caminho privado externo ao checkout, hashes/manifesto de assets, configuração/volume/imagem atual, restore em banco isolado sem porta pública; comparar páginas, admin, tracking e métricas sem expor valores. Rollback de código fixa imagem anterior; não usar rollback de banco para apagar dados novos. Migrações futuras aditivas devem ter migração compensatória documentada e cópia preservada. Teste de restore é pré-condição pendente para migração em DEV; produção segue congelada.

## Primeiro incremento — Studio privado (desenvolvido/testado localmente)

Novo `/studio`, React/TypeScript, CSS separado; não altera marca, páginas de vendas ou CSS legado. APIs `/api/platform/pages`, `/:id`, `/:id/duplicate`, `/:id/restore`, `/:id/publish` são gated por `HUBPAGES_PLATFORM_ENABLED=true`, sessão administrativa existente e origem autorizada. Flag somente no Compose DEV. Rotas públicas não resolvem IDs do Studio. APIs privadas têm Cache-Control no-store e X-Robots-Tag noindex. Não executar Pixel/GA4 na prévia.

Persistência incremental sob `payload.platform`: schemaVersion 1, pages, audit. Cada rascunho possui ownerId, UUID, origin imutável (nativo inicialmente), revision, draft, revisions e estados editorial/financeiro separados. Conta de compatibilidade `legacy-owner` é resolvida somente pelo servidor após autenticar o admin; não muda identidade, senha ou permissões existentes. Funções de domínio recebem ownerId e rejeitam IDOR. Isto NÃO é cadastro multi-tenant completo: nenhuma rota de cadastro público ou login de clientes foi aberta.

Wizard em oito etapas salva progresso, texto, seções/reordenação, imagem HTTPS, cores, idioma, checkout e intenção de domínio. Preview React renderiza strings escapadas, não HTML/scripts. Imagens remotas apenas em /studio com CSP própria. Upload direto, edição inline e publicação por artefatos ainda não implementados. Dois layouts nativos simples (Essencial e Coleção). Sem galeria pessoal, sem exportação.

Autosave 900ms com serialização de escritas no cliente, revisão otimista no backend (409 em conflito) e histórico append-only. Restaurar cria nova revisão sem apagar histórico; duplicar mantém origem e limpa domínio, sem copiar vigência. Limite inicial de uso justo: 1000 rascunhos por proprietário, 40 blocos, corpo HTTP 64 KB; política revisável, não plano de cobrança.

Asaas aprovado pelo responsável em 19/11/2026. Sem credenciais/integração real neste lote: publish sempre retorna 409 e não altera estado financeiro. Não há pedidos, cobranças, webhooks ou vendas simuladas. Rascunho não tem rota pública. Preço administrativo, Pix/cartão, reconciliação, vigência de 30 dias e expiração são próximos módulos.

Novo teste de restauração DEV: `deploy/verify-dev-restore.sh` cria dump custom protegido e manifesto SHA256, restaura integralmente em PostgreSQL efêmero sem rede/porta pública, valida tabela/páginas/admin e remove apenas o container do teste. Invocado antes de build/deploy quando o banco DEV já existe. Sem execução de migrações destrutivas. Deploy automático do workflow nesta branch limitado a develop; main não é publicado por este workflow sem nova alteração aprovada.

Pendente: auditoria privada integral de registros/contagens, E2E no DEV com admin real, tenants e cadastro/recuperação/MFA, upload/retention, publicador separado, prova DNS/SSL, Asaas sandbox+produção, GA4/Ads/eventos, importador autorizado/SSRF, notificações e teste de carga. Nenhum item pendente deve ser anunciado como pronto.
