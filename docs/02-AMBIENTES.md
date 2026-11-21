# Ambientes de homologação e produção

## Mapeamento

| Nome | Branch | URL | Cache |
| --- | --- | --- | --- |
| Homologação DEV | `develop` | `https://dev.hubpages.com.br` | Container isolado e indexação bloqueada |
| Produção | `main` | `https://hubpages.com.br` | Container isolado; domínio canônico público |

## Fluxo

```text
feature/* → pull request → develop → homologação em DEV → pull request → main → produção
```

## Regras

- `develop` é a integração contínua da próxima versão.
- `main` representa exatamente o que deve estar em produção.
- Correções urgentes partem de `main`, passam por pull request e voltam para `develop` depois da publicação.
- O endereço público e canônico de produção é `hubpages.com.br`; não existe subdomínio `app`.

## Variáveis

Os segredos administrativos ficam somente em `/opt/hubpages-secrets/dev.env` e
`/opt/hubpages-secrets/prod.env`, com permissões restritas na VPS. GitHub recebe apenas a chave SSH limitada ao
gateway de deploy; senha, código de ativação e segredo de sessão nunca são versionados.



## Studio habilitado na produção — 21/11/2026

A promoção de todas as atualizações foi autorizada pelo usuário. O Studio roda nos dois ambientes, com bancos, volumes, segredos e origens separados. `HUBPAGES_PUBLIC_ORIGIN=https://hubpages.com.br` e `HUBPAGES_ENV=production` habilitam o domínio de produção; o modo DEV continua limitado ao seu domínio/local de testes. A liberação temporária de publicação em produção usa `HUBPAGES_FREE_PUBLISH_ENABLED=true`, sem criar pagamento Asaas.

Cada ambiente incorpora somente suas próprias páginas legadas. Não se importa conteúdo, usuários de teste ou credenciais do DEV na promoção. O acesso administrativo existente de produção é mantido. Deploy em main usa o gateway restrito já configurado, com backup/restore da base de produção e verificação após a migração.
