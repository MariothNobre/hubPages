# Administração e PostgreSQL — preparação sem produção

Entrega mantida na branch `codex/feature/admin-postgres-dev`. Não mesclar em `main` sem validar a migração em DEV.

## Recursos

- URL HTTPS por página, com bloqueio de caminhos reservados e endereços duplicados.
- URL alternativa resolvida pelo servidor. Domínio próprio precisa de DNS, proxy HTTPS e inclusão em APP_ORIGINS. O painel não altera DNS nem emite certificados automaticamente.
- Publicada/rascunho persistido por página. Rascunhos não carregam no roteador público nem na API pública e não registram visitas.
- Perfil com nome, e-mail, senha atual e nova senha confirmada. Alterar senha invalida sessões existentes; entrar novamente com as novas credenciais.
- PostgreSQL próprio da HubPages em rede interna, sem porta pública ou vínculo com bancos do Sistera.

## Validação local

`pnpm lint`, `pnpm build`, `node --check server/index.mjs` e `node scripts/test-admin.mjs`.

O teste de integração utiliza arquivo temporário exclusivo e cobre login, endereço alternativo, atualização de perfil, invalidação de sessão e bloqueio de rascunho.

## Provisionamento em homologação

Após revisar e promover a branch exclusivamente para develop, executar como root na VPS:

```bash
bash /opt/hubpages-src-dev/deploy/provision-postgres-dev.sh
```

O script cria senha aleatória em `/opt/hubpages-secrets/dev-db.env`, copia o arquivo atual para `/opt/hubpages-backups/dev`, constrói a aplicação e inicia o PostgreSQL no projeto `hubpages_dev`. Não inclui o Compose de produção.

O banco usa o volume `hubpages_dev_hubpages_postgres`. O estado inicial é importado do volume DEV de conteúdo somente quando a linha inicial ainda não existe. Reinícios preservam o banco e não sobrescrevem seus dados. O arquivo JSON original permanece disponível para reversão.

Após ativação, `update-dev.sh` detecta o arquivo de senha e mantém o PostgreSQL nas próximas atualizações. Confirmar perfil, configurações privadas, contadores e conteúdos importados antes de qualquer promoção futura.

## Limites de validação desta preparação

Docker/PostgreSQL não estão disponíveis no computador desta sessão. O driver e a integração foram implementados; a migração real ainda precisa ser executada e verificada em DEV. Nenhum recurso PostgreSQL foi criado na VPS por esta entrega.

## Reversão em DEV

Preservar o volume PostgreSQL e os backups. Para voltar ao JSON anterior, iniciar somente `compose.dev.yml`, sem DATABASE_URL e sem o override. Dados alterados depois da migração precisam ser exportados antes da reversão para evitar perda de alterações.
