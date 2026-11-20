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

## Estado reconciliado após deploy — 2026-11-20 01:27 UTC

Studio publicado exclusivamente em DEV pelo merge 43abda5, Actions 44653421519 (sucesso). Restaurar backup foi efetivamente executado e validado duas vezes em PostgreSQL efêmero. Caminhos, manifestos e evidências em STEP_BY_STEP HP-002. Gates privados confirmados externamente (401); noindex confirmado no shell do Studio; produção continua sem a API nova (404). Healths DEV/produção/Sistera saudáveis. Não houve migração destrutiva nem reset de credenciais.

Pendência de escala: o primeiro incremento usa JSONB compartilhado e serialização por processo, exclusivamente para homologação do administrador. Antes de disponibilizar contas públicas, mover somente os novos recursos para tabelas relacionais aditivas com índices/transactions/tenantId, mantendo o adaptador legado e sem migrar dados existentes por fixtures.

## Segundo incremento — contas isoladas (v0.7.0-dev.2)

Migração aditiva `server/migrations/001-customer-identity.sql`, executada somente quando a flag de plataforma está habilitada: `hubpages_accounts`, `hubpages_users`, `hubpages_customer_sessions` e `hubpages_schema_migrations`. Execução transacional com advisory lock; nenhum UPDATE/DELETE em hubpages_state e nenhum usuário/admin padrão criado. O script de backup/restore do DEV precede a inicialização da nova imagem.

Cadastro de homologação por `/conta`, flag independente `HUBPAGES_CUSTOMER_SIGNUP_ENABLED=true` somente no Compose DEV; nome/e-mail/senha, confirmação no frontend e aceite obrigatório da versão `homologacao-2026-11-19`. Condições acessíveis em `/condicoes-homologacao`, marcadas como provisórias para testes sem cobrança; termos comerciais definitivos exigem revisão antes do lançamento.

APIs `/api/customer/{config,register,login,session,logout,profile}`. E-mails normalizados, unicidade no banco, conta e usuário UUID próprios criados na mesma transação, senha scrypt, sessão aleatória de 256 bits cujo SHA256 é armazenado. Cookie `hubpages_customer` HttpOnly/Secure/SameSite=Strict, 8h, separado do cookie administrativo. Perfil exige senha atual; troca de senha invalida todas as sessões da conta. Cadastro/login têm limitação de tentativas. Contas suspensas não resolvem sessões no PostgreSQL.

Proprietário do Studio resolvido exclusivamente pela sessão do servidor: accountId do cliente, ou legacy-owner para admin legado. Campos role/accountId enviados no cadastro ou rascunho não concedem privilégio. Clientes não recebem a lista de páginas legadas, nem acessam APIs administrativas. Todos os endpoints de rascunhos passam pelo mesmo controle de propriedade, inclusive duplicação/restauração/publicação.

Se houver simultaneamente sessão de cliente e admin no mesmo navegador, o Studio usa a conta do cliente; encerrar a sessão de cliente devolve o acesso de compatibilidade do admin. Nenhum cookie administrativo é apagado automaticamente. O painel administrativo continua autenticando apenas pelo cookie antigo.

Rascunhos ainda usam payload.platform por compatibilidade neste estágio de DEV. O isolamento é aplicado no backend e testado ponta a ponta com dois clientes, mas normalização relacional de páginas/revisões e autorização de múltiplos membros por conta continuam pendentes antes da abertura comercial. Não anunciar como RBAC multiusuário completo.

Validação: test-customers.mjs cria contas sintéticas em diretório temporário ou banco exclusivo `hubpages_ci`; verifica list/read/update/duplicate/restore/publish cruzados (404), APIs administrativas (401), spoof de role, e-mail duplicado/reservado, logout, troca de senha e preservação do admin/páginas/pixels/contadores legados. CI inclui PostgreSQL 17 real; somente esse banco efêmero aceita fixtures. Nenhuma fixture é enviada à VPS.

Ainda não configurados: confirmação de e-mail, recuperação por mensagem, MFA, gestão de todas as sessões pelo usuário, termos comerciais definitivos, cadastro público em produção e integração Asaas. A interface informa essas limitações e não simula envio de e-mail.

## Estado reconciliado — contas em DEV, 2026-11-20 02:09 UTC

Segundo incremento implantado pelo merge 49a6194, CI 44658301004 e deploy 44658301067 concluídos com sucesso. A migração de identidades passou no PostgreSQL 17 do CI e a aplicação DEV iniciou saudável após backup e dois restores isolados. `/conta` e a configuração de cadastro estão disponíveis em DEV; APIs privadas permanecem protegidas. Nenhuma conta sintética foi criada na VPS. Evidências e caminhos privados dos backups constam em STEP_BY_STEP HP-004.

As pendências descritas nos registros anteriores devem ser lidas cronologicamente: identidade de clientes agora possui persistência relacional e controle de acesso por conta; páginas/revisões ainda requerem normalização. Produção permanece v0.6.0, com `/api/customer/config` ausente (404). E-mail transacional, MFA, publicador e Asaas não estão ativos.

## Terceiro incremento — editor e rascunhos relacionais (v0.7.0-dev.3)

`platform-store.mjs` reutiliza as regras de domínio existentes com transações PostgreSQL por proprietário, locks entre processos e controle otimista de versão. Migração 002 cria `hubpages_page_owners`, `hubpages_studio_pages`, `hubpages_studio_revisions`, `hubpages_studio_audit` e `hubpages_studio_images`, com FKs/índices. Revisões/auditoria append-only e origem/proprietário imutáveis por trigger. Admin continua proprietário de compatibilidade legacy-owner; clientes têm FK para contas já existentes. Sem modificação de admin/pages/tracking/analytics legados.

Na primeira inicialização, a migração copia apenas payload.platform para tabelas novas e compara cada documento/revisão com o original; transação falha integralmente em divergência. Snapshot original permanece intacto. Versão 2 em schema_migrations impede reimportação após reinício. Novas gravações de Studio não regravam o payload legado. Recuar código ao adaptador antigo exige reconciliação do snapshot; não há rollback destrutivo automático.

Catálogo autenticado `/api/platform/templates`: primeiro modelo Infância Além das Telas PT, depois Essencial/Coleção. Modelo nativo é uma adaptação editável de 31 blocos derivados da página legada no repositório, preservando sua publicação original; não é reescrita pixel a pixel da rota legada. `templateInput` gera conteúdo independente com domínios/checkout/pixels vazios. Estrutura normalizada de blocos tem UUID, tipo, título, texto, imagem, botão/link e layout validado por lista permitida; sem CSS ou scripts arbitrários.

Editor React `StudioDesigner` com inspector e `StudioCanvas`, compartilhado com `/studio/preview/:id`. Alça arrasta/solta ordena seções; alternativas subir/descer; tamanhos relativos/absolutos limitados, linhas com 2/3 colunas responsivas, fonte/títulos/textos, botão, espaçamentos, alinhamento, fundo, encaixe da imagem, animações respeitando reduced-motion. Logo oficial reutilizada. Degustação é bloco sample disponível em qualquer modelo, com modal/teclado/CTA. Prévia privada usa API autenticada por proprietário, links HTTPS ativos em nova aba, noindex e ausência dos componentes legados Pixel/AnalyticsTracker.

Upload PUT/GET `/api/platform/pages/:id/images/:slot` exige autorização e origem para escrita. Formatos raster permitidos por assinatura; sem SVG. Navegador otimiza para WebP até 1600px, 2 MB final/10 MB de entrada/40 megapixels; quota de 20 MB ativos por conta. Uma linha binária por página/slot, substituída ao trocar a imagem; referências de outros IDs de página rejeitadas. Duplicação copia somente imagens ativas para espaços independentes. Salvar remove binários de slots desassociados. Sem galeria pessoal ou retenção de binários substituídos. Consequência explícita: restaurar estrutura/texto antigo não recupera a imagem sobrescrita/removida. Esta política vale apenas para novos uploads; assets legados nunca são removidos.

Persistência binária em bytea foi escolhida para este DEV limitado, mantendo imagens junto ao backup consistente sem introduzir storage compartilhado ou portas. Objeto/artefato de publicação e retenção de versão pública serão outra etapa, antes de liberar publicação. Asaas, publicador, DNS/SSL e mensagens transacionais continuam inativos. Produção permanece congelada.

## Estado reconciliado — editor em DEV, 2026-11-20 02:37 UTC

Incremento v0.7.0-dev.3 implantado pelo merge a522323, CI 44661748566 e deploy 44661748706 com sucesso. A segunda restauração do deploy já incluiu tabelas do Studio e validou a integridade das cadeias de revisões. Rotas privadas confirmadas externamente com 401; shells Studio/prévia com noindex. Produção/Sistera saudáveis, sem mudanças. Evidências em STEP_BY_STEP HP-006 e operação do editor em GUIA_EDITOR_VISUAL_DEV.md.

Upload usa referência específica da página/espaço; reutilização de URL de outro espaço é rejeitada. Atualização assíncrona do upload aplica o endereço ao UUID do bloco e usa o rascunho mais recente no cliente para preservar edições realizadas enquanto a imagem é otimizada/enviada. Publicações legadas e seus arquivos continuam usando o fluxo anterior.

## Quarto incremento — edição direta e fidelidade (v0.7.0-dev.4)

`InlineText` mantém DOM/cursor durante foco, persiste somente texto e aplica atualizações externas fora do foco. Sem HTML arbitrário salvo, scripts ou rich-text não confiável. `StudioDesigner` usa canvas integral e barra contextual sticky com popovers; navegação das oito etapas fica no cabeçalho. Propriedades de layout só sobrescrevem campos explicitamente presentes em layoutOverrides. Upload/resize identifica o bloco por UUID. Imagens continuam uma por espaço, sem biblioteca.

`LegacySalesTemplate.tsx` é derivado do JSX aprovado por `scripts/generate-legacy-template.mjs` e runtime versionado, com SHA256 do original e geração normalizada entre Windows/Linux. Estilos/assets originais compartilhados, sem modificar suas fontes. Na prévia não há wrappers de edição; teste SSR exige o mesmo HTML inicial do componente original, além de testes de remoção de CTAs. Toolbars aparecem somente no editor. Origem deste modelo é nativa, não importação de site de terceiro.

`templateRole`, `templateTexts`, `templateButtons`, `layoutOverrides`, showButton/inheritLink são campos aditivos do documento; sem nova tabela ou migração de schema. Permissões e validação são aplicadas nas APIs existentes. Cadastro de botões respeita HTTPS; URL removida com inheritLink=false fica sem destino, sem fallback indesejado. Textos de modelo preservam espaços necessários entre elementos inline. API de rascunhos limitada a 256 KB; binários não entram nesse corpo.

Modelo inicial conserva as 13 seções e 16 CTAs da página original. As 12 páginas da degustação ficam no leitor original; FAQ não recebe CTA por pergunta. Papéis do seed mantêm seções agrupadas (bônus/perguntas/degustação) e cópias antigas recebem compatibilidade por evidências de título/imagem/tipo. Remover/reordenar/editar modifica apenas o rascunho da conta.

Botões adicionais em perguntas/autor só são renderizados após ativação explícita; o estado inicial continua sem esses CTAs. A movimentação de grupos entre seções preserva todos os seus blocos, enquanto a movimentação interna altera sua ordem. LayoutOverrides distingue o estilo original das alterações desejadas; redimensionar imagem não regrava margens, fundo, fonte ou botões da seção.

Preview legado usa shell independente do CSS administrativo para preservar medidas/cores/fonte, mantendo barra de homologação externa à página e API autenticada/noindex. Nunca instancia MetaPixel ou AnalyticsTracker. A página original de produção continua com sua implementação completa. Publicador/Asaas/e-mail/MFA permanecem etapas pendentes.

## Estado reconciliado — v0.7.0-dev.4, 2026-11-20 03:21 UTC

Implantação exclusivamente DEV concluída no merge 0407d65, CI 44666800925 e deploy 44666801038 bem-sucedidos. Dois restores com histórico íntegro, APIs privadas protegidas e healths DEV/produção/Sistera saudáveis. Referências em STEP_BY_STEP HP-008. Produção e publicações comerciais de rascunhos novos continuam fora deste lote.

## Quinto incremento — lixeira e publicador temporário DEV (v0.7.0-dev.5)

Autorização explícita do responsável permite publicação gratuita temporária durante a integração Asaas, exclusivamente no DEV. Feature flag nova exige ambiente development, origem de publicação allowlisted (dev.hubpages.com.br, localhost somente testes) e APP_ORIGINS compatível; leitura pública exige Host canônico. Não há ativação em produção. A regra permanente de importadas permanece fail-closed: somente modelos nativos usam este publicador. Domínio próprio/verificação continua outro módulo.

Estado de página: editorialStatus=draft/published, trashedAt opcional, publication com referência de snapshot/revisão/URL/mode. DELETE privado é exclusão lógica, com revisão esperada e auditoria; oculta de list/read/edit/duplicate/publish/images, despublicando atomicamente. Lixeira GET e restauração POST untrash têm o mesmo filtro ownerId. Restaurar sempre retorna rascunho. Cada transição cria revisão append-only para invalidar gravações antigas. Não há exclusão definitiva e dados legados não entram nessas rotas.

Migração 003 cria hubpages_studio_publications e hubpages_studio_publication_images. Snapshots JSONB e binários são imutáveis por trigger; FKs de conta/página e revisão (diferida) garantem consistência transacional. Publicar valida conteúdo/origem/endereço/revisão, copia apenas imagens privadas referenciadas, reescreve suas URLs para o snapshot público, insere o snapshot, muda status e audita na mesma transação. Nenhuma alteração financeira: mode=dev-free, financialStatus=unpaid e nenhuma vigência paga gerada. Asaas continua não configurado.

GET /api/public/pages/:id resolve o snapshot da publicação ativa e devolve apenas conteúdo público; GET /api/public/publications/:id/images/:slot serve o binário de versão previamente publicada enquanto a página estiver ativa. Despublicar/trash bloqueiam ambos. /p/:id renderiza StudioCanvas/LegacySalesTemplate sem autenticação, ferramentas ou faixa privada; noindex no DEV. Botões apontam aos checkouts configurados. Rascunhos mantêm suas rotas privadas e nunca são resolvidos automaticamente pelo endereço público.

Edições e troca/remoção de imagens privadas não mudam o snapshot no ar. Republicar gera versão nova. Imagens de versões anteriores permanecem para histórico/continuidade de visitantes; quando a página sai do ar, seus endpoints também deixam de servir. Essas cópias são versão de publicação, não biblioteca pessoal. Quota DEV de 100 MB/conta em binários publicados, sem expurgo automático. Snapshots estão no mesmo backup PostgreSQL consistente; script de restore verifica FK lógica de revisão além da cadeia privada.

UI: cartões com Rascunho/Publicada, link para página ativa, aviso de revisão posterior à publicação, Excluir página com diálogo, Lixeira e Restaurar. Etapa 8 permite Publicar/Atualizar publicação/Despublicar. Resultado de publicação não sobrescreve alterações locais feitas enquanto a requisição estava em trânsito. Desativar a flag impede novas publicações gratuitas, preservando as já liberadas até despublicação explícita.

Limites: concessão gratuita de homologação sem expiração financeira automática; cobrança/30 dias/renovação/reembolso Asaas, domínio próprio e trackers das páginas novas ainda pendentes. Pixel/online/CAPI/admin e páginas legadas permanecem inalterados. Testes isolados com dois clientes cobrem publicação anônima, snapshots imutáveis, remoção/retorno e invariantes; nenhuma fixture vai à VPS. Produção continua congelada.
