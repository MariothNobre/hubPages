# Arquitetura da HubPages

## Objetivo

A HubPages será uma central de páginas de vendas de ebooks. Cada produto recebe uma rota própria sob o domínio
principal, mantendo marca, infraestrutura e análise centralizadas.

## Stack

- React + TypeScript.
- Vite para desenvolvimento e build do frontend.
- React Router para rotas legíveis.
- Serviço Node.js isolado para arquivos estáticos, API administrativa e health check.
- Persistência leve em arquivo JSON com gravação atômica e volume Docker exclusivo por ambiente.
- GitHub como fonte oficial, histórico e CI.
- Docker na VPS Hostinger como destino dos ambientes.

## Estrutura de rotas

```text
hubpages.com.br/
├── infancia_alem_das_telas
└── <slug_do_proximo_ebook>
```

As URLs são rotas do aplicativo, não cópias independentes de código. Isso permite componentes compartilhados,
identidade visual consistente e manutenção centralizada.

## Princípios

1. Nenhuma credencial é versionada.
2. Homologação DEV e produção são destinos isolados.
3. Produção recebe somente código aprovado em `develop`.
4. Toda publicação deve ser rastreável por commit e pull request.
5. Checkout e métricas usarão variáveis de ambiente quando forem integrados.
6. A HubPages não compartilha volumes, bancos, secrets ou redes internas com o Sistera.
7. Campos editáveis pelo painel passam por schema e não aceitam HTML ou scripts arbitrários.

