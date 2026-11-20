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
