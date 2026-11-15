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

Os arquivos `.env.*.example` documentam nomes e valores públicos. Segredos reais devem ficar nos ambientes da
Hostinger ou nas configurações protegidas do GitHub, nunca no repositório.

