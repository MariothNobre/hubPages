# HubPages

Central de vendas de ebooks construída em React + TypeScript e publicada em compartimentos Docker isolados na
VPS Hostinger que também hospeda o Sistera.

## Ambientes

| Ambiente | Branch | Endereço | Finalidade |
| --- | --- | --- | --- |
| Homologação DEV | `develop` | `https://dev.hubpages.com.br` | Desenvolvimento, homologação e aprovação |
| Produção | `main` | `https://hubpages.com.br` | Site público na pasta raiz do domínio |

O fluxo reproduz o padrão do Sistera: toda mudança entra primeiro em `develop`; a promoção para produção ocorre
por pull request para `main`, depois das verificações automáticas e da validação no DEV.

## Rotas iniciais

- `/`: central HubPages.
- `/infancia_alem_das_telas`: primeira página de vendas reservada para o ebook **Infância Além das Telas**.

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

Verificações antes de abrir um pull request:

```bash
pnpm lint
pnpm build
```

## Documentação operacional

1. [Arquitetura](docs/01-ARQUITETURA.md)
2. [Ambientes de homologação e produção](docs/02-AMBIENTES.md)
3. [VPS Hostinger e isolamento](docs/03-VPS-HOSTINGER.md)
4. [Versionamento e publicação](docs/04-VERSIONAMENTO-E-PUBLICACAO.md)
5. [Como adicionar um novo ebook](docs/05-NOVO-EBOOK.md)
6. [Evolução para plataforma dinâmica](docs/06-EVOLUCAO-PLATAFORMA-DINAMICA.md)

Consulte o [CHANGELOG](CHANGELOG.md) para acompanhar versões e entregas.

