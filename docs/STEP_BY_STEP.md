# Histórico de evolução HubPages — append-only

Os documentos 01–10 preservam o histórico anterior. Este arquivo inicia a governança solicitada pelo prompt mestre; não substitui Git, migrações, backups ou logs.

## HP-000 — v0.7.0-dev.1 — Auditoria e plano

- UTC: 2026-11-20 01:11; BRT: 2026-11-19 22:11. Autor: Codex, sob solicitação do responsável.
- Base: ca0574981d787323dd5e20ddefc2a07ba1906f2f (v0.6.0); Actions produção 44610509023 concluído com sucesso. Branch nova: codex/feature/plataforma-dev.
- Evidências: leitura do prompt mestre local; Git limpo na base; código/Compose/APIs revisados; Hostinger confirmou VPS running. Consultas públicas DEV/produção e setup-status realizadas, sem login ou disparo de Pixel. Nenhum segredo incluído neste relatório.
- P0 preservados: componentes PT/ES, Brand, MetaPixel, AnalyticsTracker, assets, APIs e admin existente. Inventário e lacunas em ARQUITETURA_SOFTWARE.md.
- Testes baseline: scripts/test-admin.mjs e scripts/test-page-address.mjs passaram em instância local/arquivo temporário, sem alterar VPS.
- Banco: zero alteração real nesta etapa. Backups existentes descritos pelos scripts/logs históricos; restore direto ainda não verificado. Migração real bloqueada até teste de restauração isolada.
- Produção: nenhuma alteração/deploy. DEV: nenhuma implantação nova nesta etapa.
- Plano: recursos aditivos por namespace/feature flag, central/editor privado primeiro; isolamento multi-tenant e pagamentos verificados antes do lançamento público.
- Dependências externas: provedor Pix/cartão pendente de escolha e credenciais; DNS/SSL por domínio exigem verificação; protótipo HTML anterior não localizado no ambiente acessível.
- Rollback: remover somente código novo ou desativar feature flag; não excluir dados legados/volumes. Preservar banco e publicar imagem anterior se necessário após backup.
- Commit: consultar o commit que introduz este registro; não inserir SHA presumido. Próximo lote: proteção CI e rascunhos privados compatíveis, sem liberar publicação paga ou importação.

## HP-001 — v0.7.0-dev.1 — Compatibilidade e Studio privado

- UTC: 2026-11-20 01:22; BRT: 2026-11-19 22:22. Autor: Codex.
- Asaas escolhido explicitamente para Pix/cartão; credenciais ainda não fornecidas. Sem requisição a API financeira, cobrança, pedido ou webhook simulados.
- Arquivos: server/platform.mjs, server/index.mjs (namespace privado), src/pages/StudioPage.tsx, src/studio.css, App.tsx, link DEV no AdminPage; testes platform/admin/legacy-preservation; CI; workflow de deploy restrito a develop; Compose DEV feature flag; script de backup/restore isolado.
- Funcional: central de rascunhos do admin existente, criar/renomear/duplicar, oito etapas persistidas, edição de textos/seções/cor/imagem HTTPS/checkout/IDs, autosave, histórico, restauração como nova versão, preview desktop/tablet/mobile autenticado. Lista legada permanece separada para preservar o editor atual.
- Banco: apenas estrutura JSONB aditiva `platform` quando o administrador cria o primeiro rascunho. Nenhuma alteração em admin/pages/tracking/analytics pelo novo módulo, comprovada com estado sintético nos testes. Sem migração de registros existentes.
- Testes locais: lint, build, test-platform, test-admin, test-page-address, test-legacy-preservation passaram. Teste visual autenticado em localhost com usuário sintético: criação, edição, autosave e persistência após reload confirmados. Fixtures nunca enviadas à VPS.
- Proteções: 401 anônimo, origem validada, 404 outro proprietário, 409 revisão desatualizada; publish 409 sem cobrança; duplicação conserva taint; artefatos/rascunhos não publicados.
- Desenvolvido mas ainda não publicado no momento deste registro. Restore PostgreSQL ainda a executar no pipeline DEV; seu resultado será registrado em entrada posterior.
- Rollback: flag DEV off e imagem anterior, mantendo payload.platform e todas as revisões. Não limpar banco/volumes. Main/produção não alterados.
- Próximo lote: consolidar isolamento por conta e schema relacional aditivo após restore, fluxo de clientes, upload/artefatos e Asaas real. O sistema SaaS completo ainda não está entregue.

## HP-002 — v0.7.0-dev.1 — Homologação e restore comprovados

- UTC: 2026-11-20 01:27; BRT: 2026-11-19 22:27. Autor: Codex.
- Commits: dc0c1e6 (auditoria/governança), 3656741 (implementação), 43abda5 (merge DEV).
- CI 44653421406: sucesso. Deploy DEV 44653421519 / job 136013658972: sucesso. Logs confirmam dois testes de restore (a esteira publica e reprovisiona o painel), PostgreSQL e app healthy.
- Backups restaurados e verificados: `/opt/hubpages-backups/dev/verified-20261120T012456Z-2879747.dump` e `/opt/hubpages-backups/dev/verified-20261120T012612Z-2882025.dump`; manifestos SHA256 e IDs de imagem no mesmo diretório privado. Containers de teste sem rede/porta pública removidos pelo trap; volumes reais preservados.
- Consulta SQL pós-deploy confirmou uma página configurada no estado legado de DEV; nenhum dado de produção ou fixture de teste foi copiado para DEV. Registros legados não foram removidos ou criados pelo Studio.
- Verificação externa: `/studio` DEV 200 com noindex/nofollow/noarchive; `/api/platform/pages` anônimo 401. Health DEV e produção ok, Sistera 200. API de plataforma em produção 404: não implantada lá.
- Banco: nenhuma migração relacional ou conversão de dados legados; criação de rascunhos futuros adiciona apenas payload.platform. Usuário/admin real preservado; login manual remoto não executado por ausência de credencial e desnecessário para alterar senhas existentes. Login/edição/persistência visual comprovados apenas na instância local sintética.
- Status: primeiro incremento publicado em DEV. Produção continua em ca05749/v0.6.0, sem merge, tag de release de produção ou alteração DNS/proxy/firewall.
- Acesso para homologação: https://dev.hubpages.com.br/admin, depois link HubPages Studio, ou https://dev.hubpages.com.br/studio após autenticar.
- Próximos critérios de aceite: clientes/tenants reais com IDOR E2E, uploads e artefatos versionados, domínio verificado, Asaas sandbox+webhook e vigência real. Asaas está aprovado, mas não integrado nem anunciado como ativo.

## HP-003 — v0.7.0-dev.2 — Identidades e contas de homologação

- UTC: 2026-11-20 02:05; BRT: 2026-11-19 23:05. Autor: Codex. Branch codex/feature/contas-isoladas-dev.
- Arquivos: migration 001-customer-identity.sql, identity-store.mjs, customer-auth.mjs, index.mjs; CustomerAccountPage.tsx, StudioPage.tsx, App.tsx, studio.css; Compose DEV, CI, test-customers.mjs.
- Desenvolvido/testado localmente: cadastro/login/logout/perfil de cliente, aceite versionado, conta UUID isolada, revogação de sessões ao mudar senha, proprietário de rascunho derivado de sessão e acesso legado mantido. Nenhuma redefinição de senha/admin existente.
- Teste integrado com duas contas sintéticas: list/read/update/duplicate/restore/publish cruzados recusados, role spoof ignorado, clientes sem acesso ao admin; dados legados idênticos após operações. Lint/build e regressão anterior passaram. Inspeção visual localhost: login da Conta B, Studio vazio sem dados da Conta A e perfil próprios confirmados.
- Banco: tabelas novas aditivas com FKs/índices e migração versionada transacional; sem alteração do estado legado. A aplicação real da migração em DEV ainda depende do CI PostgreSQL e do pipeline de restore/deploy.
- Produção: sem merge/main, sem deploy, sem DNS/proxy/firewall alterados. Cadastro de clientes liberado somente no DEV após publicação.
- Pendências: e-mail transacional/recuperação/MFA, páginas/revisões relacionais, upload/retention, publicador/domínios e Asaas. Condições são de homologação, não termos comerciais definitivos.
- Backup/rollback: dump+restore isolado obrigatório antes do deploy DEV. Desabilitar flags ou voltar imagem anterior preserva as tabelas e contas novas; não executar DROP/TRUNCATE.
- Próximo: validar migração e isolamento em PostgreSQL real no CI antes de mesclar em develop, então registrar evidência de publicação.

## HP-004 — v0.7.0-dev.2 — Contas publicadas em DEV

- UTC: 2026-11-20 02:09; BRT: 2026-11-19 23:09. Autor: Codex.
- Implementação 7b33b72, PR #1, merge develop 49a61945ab72ef699b463c3656794c72d9330b62. CI do PR 44658134029 e CI develop 44658301004: sucesso, incluindo migração e isolamento com duas contas em PostgreSQL 17 efêmero.
- Deploy DEV 44658301067 / job 136029899996: sucesso. Backup e restore isolado comprovados antes da atualização: `/opt/hubpages-backups/dev/verified-20261120T020541Z-2925419.dump` e `/opt/hubpages-backups/dev/verified-20261120T020639Z-2927355.dump`. Banco e aplicação healthy nos logs. Nenhuma fixture de teste aplicada na VPS.
- Verificação externa: `/conta` 200 com noindex; `/api/customer/config` 200 com cadastro habilitado e termos versionados; `/api/customer/session` anônimo retorna authenticated=false; `/api/platform/pages` anônimo 401. Em produção `/api/customer/config` continua 404. Sistera retorna 200.
- Acesso: https://dev.hubpages.com.br/conta para cadastro/login/perfil; https://dev.hubpages.com.br/studio para rascunhos privados. O administrador existente continua pelo `/admin`, com suas credenciais preservadas.
- Migração aditiva inicializada na nova aplicação DEV; não houve migração de usuários antigos, redefinição de senha ou transferência de registros de produção. Cadastro e alteração de senha reais ficam disponíveis para homologação pelo responsável; testes visuais e de credenciais desta entrega usaram somente contas sintéticas locais/CI.
- Produção continua v0.6.0/ca05749, sem merge main, deploy ou mudança DNS/proxy/firewall. Sem cobrança Asaas, envio de e-mail ou publicação pública de rascunhos.
- Próximo lote: normalizar páginas/revisões em tabelas isoladas e implementar upload/artefatos; depois publicador/domínios e Asaas com credenciais e webhooks verificados. Recuperação por e-mail e MFA continuam pendentes. Este registro não declara o prompt mestre integralmente concluído.

## HP-005 — v0.7.0-dev.3 — Editor visual, modelo legado e persistência relacional

- UTC: 2026-11-20 02:30; BRT: 2026-11-19 23:30. Autor: Codex. Branch codex/feature/rascunhos-postgres-dev. Desenvolvido; CI PostgreSQL e deploy ainda pendentes neste registro.
- Escopo incorporado das instruções do responsável: primeiro modelo derivado da página legada PT, edição de textos/layout, arrastar blocos, imagens por espaço sem biblioteca, dimensionamento/espaçamentos/colunas/animações, degustação reutilizável e prévia autenticada com links ativos.
- Arquivos: platform-store.mjs, migrations/002-platform-pages.sql, templates.mjs e templates/infancia-pt.json; platform.mjs/index.mjs; StudioCanvas, StudioDesigner, studio-model, StudioPreviewPage, StudioPage, App e studio.css; test-customers.mjs.
- Modelo nativo derivado dos textos/arrays e ativos do repositório: 31 blocos, 12 imagens de degustação, 5 bônus, autor, ofertas e FAQ. Cada uso cria um rascunho independente. Sem herdar domínio, credenciais Pixel ou checkout financeiro de terceiros. Páginas e ativos legados não foram modificados.
- Editor: propriedades por bloco/cabeçalho; alça HTML5 arrasta/solta, ações acessíveis subir/descer, linhas de 2/3 colunas responsivas, largura, altura/encaixe de imagem, fontes/tamanhos, alinhamento, margens, padding, gap, cores, animações com reduced-motion, botões com link próprio, linha/separador/espaço e FAQ. Não é canvas de posicionamento absoluto nem cópia do produto Wix.
- Degustação opcional em qualquer modelo: blocos sample, imagens/legendas editáveis, modal na mesma página, anterior/próxima/teclado e CTA. Prévia `/studio/preview/:id` exige a sessão/propriedade para carregar conteúdo; noindex; checkout HTTPS abre nova aba; nenhum Pixel ou contador executado.
- Imagens novas: otimizadas no navegador para WebP até 1600px; entrada até 10 MB, saída até 2 MB, formatos JPEG/PNG/WebP; limite ativo de 20 MB/conta. Banco guarda uma imagem por página/espaço, substituição sobrescreve o binário e remoção de espaço libera o registro ativo. Sem biblioteca nem arquivo binário de versões antigas, conforme solicitação atual. Histórico de textos/estrutura permanece; imagem enviada substituída não é recuperada por restauração de versão. Ativos públicos legados permanecem preservados integralmente.
- Migração 002 aditiva e transacional: owners, páginas, revisões append-only, auditoria e imagens. Snapshot payload.platform é lido/copiad​o uma vez, comparado integralmente após round-trip e preservado sem UPDATE. Aplicações seguintes usam tabelas novas, sem reimportar snapshot antigo. Locks por conta no PostgreSQL evitam perda de gravações entre processos; revisão otimista rejeita conflito com 409. Origem/proprietário e histórico protegidos também por triggers.
- Testes locais: regressão de legado/admin/URLs/contas e templates, edições simultâneas (200+409), restauração, imagens privadas e duplicação passaram; lint/build passaram antes do último ajuste de linhas. Inspeção local com conta sintética confirmou primeiro modelo, edição do título, prévia com parâmetros de checkout preservados, navegação da degustação, imagens sem falhas e ausência de script Facebook.
- Banco DEV ainda não alterado por este registro; backup+restore isolado obrigatório antes de iniciar nova imagem. Sem fixtures na VPS. Produção/main/DNS/proxy/firewall e Sistera não alterados.
- Rollback: manter tabelas/snapshot/backups e preferir correção de código conservando o adaptador relacional. A imagem dev.2 lê apenas snapshot antigo; não voltar a ela permitindo novas edições sem reconciliar as páginas/revisões relacionais atuais. Desabilitar a plataforma temporariamente preserva os dados; nunca apagar tabelas/volumes para reverter.
- Próximo: CI com migração de rascunho existente, idempotência, concorrência e triggers no PostgreSQL real; publicar somente em DEV e registrar evidências. Publicador versionado/Asaas/domínios/e-mail/MFA continuam pendentes.

## HP-006 — v0.7.0-dev.3 — Editor publicado e verificado em DEV

- UTC: 2026-11-20 02:37; BRT: 2026-11-19 23:37. Autor: Codex.
- Commits d754ba2 e 21b2020, PR #2, merge develop a522323549027763892df6f18609f7f0df07f4f9. CI PR 44661369499 e 44661572448: sucesso; CI develop 44661748566: sucesso. PostgreSQL real comprovou migração do rascunho/revisões existentes, reinício sem reimportação, estado legado intacto, concorrência 200+409, isolamento, imagens e triggers de imutabilidade. Erros SQL append-only/immutable nos logs são rejeições esperadas pelos testes.
- Deploy DEV 44661748706 / job 136041374741: sucesso. Restore anterior à migração: `/opt/hubpages-backups/dev/verified-20261120T023429Z-2956965.dump`. Segundo restore, já com schema novo: `/opt/hubpages-backups/dev/verified-20261120T023526Z-2958939.dump`; logs confirmam cadeias de revisões íntegras. Banco/app healthy. Nenhuma fixture ou conta de teste enviada à VPS.
- Verificação externa: shell Studio e prévia 200 com noindex/nofollow/noarchive; APIs templates/pages anônimas 401. DEV/produção health 200; API customer continua ausente em produção (404); health do Sistera 200. Bundle novo servido no DEV. Sem login remoto ou alteração de credenciais reais.
- Comparação somente leitura dos textos públicos PT de produção confirmou título, descrição, faixa, eyebrow e CTA iguais ao primeiro modelo. Testes de preservação confirmam que páginas PT/ES, CSS/ativos públicos, logo, Pixel e monitor legados não foram alterados.
- Visual local final: conta sintética criou modelo, editou título/checkout, abriu prévia privada, navegou entre páginas da degustação e mudou ordem das seções; nenhuma imagem quebrada ou script Facebook na prévia. Captura local da interface guardada fora do repositório em `C:/Users/proce/Documents/Codex/hubpages-editor-dev.jpg`; servidor de teste encerrado.
- Guia de uso versionado: docs/GUIA_EDITOR_VISUAL_DEV.md. Acesso de homologação: https://dev.hubpages.com.br/studio. Etapas Conteúdo/Identidade abrem editor; Revisão abre prévia completa com links ativos.
- Limites transparentes: arrastar/soltar ordena blocos, sem posicionamento absoluto livre; imagens novas substituídas não têm binário histórico; checkout precisa ser configurado na cópia nova. Cobrança/publicação de rascunhos continua bloqueada. Produção permanece v0.6.0/ca05749; main/DNS/proxy/firewall/Sistera não alterados.
- Próximo: artefatos/versionamento de publicação, domínios verificados e integração real Asaas; confirmação/recuperação por e-mail e MFA ainda pendentes. Não é conclusão integral do prompt mestre.

## HP-007 — v0.7.0-dev.4 — Edição direta e modelo fiel ao original

- UTC: 2026-11-20 03:13; BRT: 2026-11-20 00:13. Autor: Codex. Branch codex/feature/editor-direto-dev. Desenvolvido/testado localmente; CI/deploy pendentes neste registro.
- Solicitações incorporadas: editar no próprio layout sem coluna de propriedades; mover navegação/salvar/voltar ao cabeçalho; manter estrutura visual exata da página PT indicada; remover CTAs excedentes e permitir adicionar/remover botões/links individualmente.
- Arquivos: InlineText, StudioCanvas, StudioDesigner, StudioPage, StudioPreviewPage, studio-model, legacy-template-model, LegacySalesTemplate; studio.css; platform/index/templates JSON; generator/runtime e teste SSR; testes customer e CI; guia de uso e arquitetura.
- Textos plaintext-only editáveis no canvas com cursor preservado, composição IME e colagem somente texto; estilos/links em popovers contextuais, upload no elemento e alça de dimensionamento. Navegação em linha no cabeçalho; largura do editor ampliada. Autosave, revisão otimista, histórico e isolamento mantidos. Upload assíncrono é limitado à página que o iniciou.
- Modelo: renderizador gerado do JSX original PT, reutilizando classes/ativos/CSS existentes. Nenhuma alteração no componente original, logo, assets, Pixel ou tracker. Templates/cópias não recebem Pixel/token/checkout/domínio reais automaticamente. Degustação original em modal, grades e selos restaurados; 13 seções principais e 16 CTAs no estado inicial, mais o CTA do modal quando aberto, nas posições originais.
- Controles por botão: enabled/showButton, texto, URL própria, herança explícita de checkout; remover link não volta silenciosamente ao checkout padrão. Cabeçalho/hero/FAQ/mobile/modal independentes; adicionar bloco de botão ou reativar botão oculto preserva a configuração. Layout guarda somente os campos explicitamente ajustados para não substituir estilos originais ao redimensionar uma imagem.
- Compatibilidade: papéis de seções inferidos para cópias antigas sem apagar conteúdo/IDs; novas cópias recebem papéis no seed. Campos novos são aditivos no documento de rascunho e revisão. Sem DDL/migração de banco neste lote. Limite JSON das APIs de plataforma ampliado para 256 KB; admin legado mantém 64 KB e imagens mantêm 2 MB.
- Testes: lint/build e regressão local passaram; SSR compara HTML real do componente original e modelo (normalização de espaços/comentários e atributos aria-disabled), com igualdade de textos, estrutura, classes, imagens e CTAs; remover dois botões resulta em exatamente dois CTAs a menos. CI exige geração determinística e ausência de diff no componente gerado. Customer E2E verifica persistência de textos diretos, papéis, botões e links removidos.
- Navegador local: título/apresentação/CTA editados, cursor e persistência após reload confirmados; upload direto e dimensionamento por arraste confirmados. Modelo fiel comparado em navegador com a URL pública indicada: mesma sequência de 13 seções, 16 CTAs, hero 1232,8px, h1 76,8px, capa 391,519px no mesmo viewport. Degustação abriu; zero imagens quebradas. A visita de leitura à referência pública pode gerar uma visita real nos contadores existentes; nenhum contador foi editado/simulado.
- Screenshot local: `C:/Users/proce/Documents/Codex/hubpages-template-fiel-dev.jpg`. Instância sintética encerrada; nenhuma fixture/credencial inserida na VPS. Produção permanece intacta. Rollback do código para dev.3 mantém dados extras nas tabelas e exige não salvar pela UI antiga para evitar descartar campos novos; preferir correção adiante ou desabilitar edição conservando o banco.
- Próximo: CI PostgreSQL e deploy exclusivamente DEV, com backup+restore isolado; registrar evidências. Publicador financeiro continua bloqueado e não foi anunciado como concluído.
