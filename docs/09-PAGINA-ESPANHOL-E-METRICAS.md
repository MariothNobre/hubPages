# Página em espanhol e métricas do painel

## Rotas

- Português: `https://hubpages.com.br/infancia_alem_das_telas`
- Espanhol: `https://hubpages.com.br/infancia_alem_das_telas_es`
- Administração: `https://hubpages.com.br/admin`

## Como editar uma página

1. Entre em `/admin` com o e-mail administrativo.
2. No seletor **Escolher página para editar**, escolha **Português** ou **Español**.
3. Altere Red Line, contexto, título, abertura, texto e destino do CTA.
4. Revise a configuração do Meta Pixel da página selecionada.
5. Use **Visualizar página** para conferir a rota correta.
6. Clique em **Salvar alterações**.

Cada idioma possui conteúdo independente. Na primeira gravação da versão espanhola, a configuração privada da API de Conversões pode herdar a configuração da página em português; o token continua armazenado exclusivamente no volume privado do servidor.

## Métricas

O painel mostra, separadamente para PT-BR e ES:

- **acessos acumulados**: incrementado uma vez por carregamento da página na sessão do navegador;
- **online agora**: visitantes que enviaram um sinal de presença nos últimos 45 segundos.

O navegador envia presença a cada 15 segundos. O total acumulado fica persistido em `/data/content.json`; a presença em tempo real fica somente na memória do processo e recomeça após reinício ou nova publicação.

## Meta Pixel

As duas rotas enviam `PageView` com identificação própria. A versão espanhola preserva o ID do Pixel, o estado de ativação e, quando configurados, o token da API de Conversões e o código de teste. O evento do navegador e o evento da API usam o mesmo `event_id` para deduplicação.

## Validação antes de publicar

```bash
pnpm lint
pnpm build
```

Depois da publicação:

1. abra as duas rotas públicas;
2. confirme as capas e os textos no idioma correto;
3. abra a degustação da versão espanhola e percorra as 12 páginas;
4. acesse `/admin`, alterne entre os idiomas e confira os contadores;
5. valide `https://hubpages.com.br/health.json`.

## Versão

Esta entrega corresponde à versão `v0.5.0`, com página espanhola, edição bilíngue, visitas acumuladas e presença em tempo real.
