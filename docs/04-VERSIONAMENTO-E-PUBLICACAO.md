# Versionamento e publicação

## Branches permanentes

- `develop`: ambiente DEV.
- `main`: produção em `hubpages.com.br`.

## Branches de trabalho

- `feature/<descricao>` para funcionalidades.
- `fix/<descricao>` para correções.
- `docs/<descricao>` para documentação.
- `hotfix/<descricao>` para urgências de produção.

## Passo a passo de uma entrega

1. Atualize `develop`.
2. Crie uma branch de trabalho.
3. Implemente e execute `pnpm lint` e `pnpm build`.
4. Atualize o `CHANGELOG.md` quando a mudança for relevante.
5. Abra pull request para `develop`.
6. Após CI e revisão, faça merge e valide em `dev.hubpages.com.br`.
7. Abra pull request de `develop` para `main`.
8. Faça merge somente depois da homologação.
9. Valide `hubpages.com.br` e crie a tag da versão, por exemplo `v0.2.0`.

## Versionamento semântico

- MAJOR: mudança incompatível.
- MINOR: funcionalidade nova compatível.
- PATCH: correção compatível.

## Rollback

1. Identifique o último commit estável em `main`.
2. Reverta por pull request, sem reescrever o histórico.
3. Aguarde o deploy automático.
4. Valide as páginas públicas e registre o incidente no changelog.

