# Importação de páginas e modelo Sabor — DEV

Entrega HP-036 / v0.9.0-dev.1. Disponível somente no ambiente DEV. Produção e Sistera permanecem separados.

## Usar em sete passos

1. **Importar:** em Minhas páginas, clique em **Importar página de vendas**, à direita de Criar minha página de vendas. Informe o HTTPS direto da oferta, confirme sua autorização e aguarde a captura. Apenas essa página e seus recursos visuais são copiados.
2. **Conteúdo:** clique nos textos para editar. Troque imagens/vídeos pelo controle central; ajuste tamanho, layout, ordem e visibilidade. Duplique/remova seções e use Desfazer quando necessário. O editor não abre checkouts ao selecionar botões.
3. **Checkout:** configure seu link padrão ou destinos por botão. Os destinos originais ficam disponíveis para consulta e adoção explícita. Navegação para outras páginas não é importada; âncoras continuam dentro da cópia.
4. **Rastreamento:** configure o Pixel numérico e, opcionalmente, a API de Conversões desta página. Scripts/pixels da origem nunca são executados. Editor e prévia não geram eventos de venda.
5. **Endereço:** digite apenas o trecho final do link e confira a disponibilidade. Ao republicar com novo endereço, o anterior deixa de resolver a página.
6. **Revisão:** teste no computador, tablet e celular. Confira textos, imagens e destinos; marque a confirmação. Qualquer alteração posterior pede nova revisão.
7. **Publicação:** publique no link escolhido do DEV. Alterações seguintes ficam em rascunho até republicar. Retirar do ar mantém o conteúdo disponível para editar.

A etapa Importação permite renomear a cópia e escolher **Original, Oceano, Lavanda, Bosque, Solar ou Rosé**. Os temas recebem automaticamente o nome `Nome do modelo · Paleta`. Cores do HTML/CSS mudam; as cores gravadas nas fotos e capas permanecem.

## Segundo modelo: Sabor

- Fonte autorizada: https://comericoenminutos.online/.
- Nome de catálogo: **Sabor**, categoria Gastronomia. Página de exemplo: **Coma Bem em Minutos — teste de importação**.
- Captura de referência: 21 seções, 22 mídias, 11 destinos de compra, 5 scripts descartados, nenhuma mídia sem download. Textos e 12 artes com lettering em espanhol foram localizados em português brasileiro. Fotografias e os três clipes culinários foram preservados.
- Miniaturas do card são capturas reais do modelo: abertura, coleção, oferta e FAQ. O fluxo permite escolher a paleta, explorar a página inteira e criar um rascunho separado com esse modelo.
- O exemplo é provisionado uma única vez no acesso existente do proprietário, somente no DEV. Usa o checkout público da página autorizada; não efetua compras. Um endereço ocupado não é sobrescrito. Reexecuções preservam alterações feitas pelo usuário.
- O script de provisionamento recusa execução fora de `development` e do domínio `dev.hubpages.com.br`. Credenciais e dados de produção não são importados.

## Regra de marca e fidelidade

Importações comuns preservam o rodapé original, sem adicionar logo ou link HubPages. Mesmo uma importação comum da URL de teste segue essa regra. A exceção autorizada é somente a derivação curada **Sabor**, de autoria do proprietário: pode exibir a marca HubPages no rodapé, sem link, e tem um controle específico de exibição. Essa proveniência não pode ser promovida pela edição de outra página.

A captura mantém a estrutura visual HTML/CSS e mídias compatíveis. Não executa JavaScript remoto, pixels, formulários de envio ou aplicações da origem. Menus externos são removidos como navegação, preservando seu texto; âncoras são mantidas. FAQ com details/summary funciona nativamente. Widgets que dependem de serviços/scripts próprios precisam ser reconstruídos/configurados no Studio. Recursos não capturados são informados e podem ser substituídos. Não há promessa de clonar aplicações autenticadas ou páginas dependentes de renderização JavaScript.

## Armazenamento e proteção

- HTTPS público com validação de DNS/IP em cada redirecionamento; bloqueia redes privadas, localhost, metadados de nuvem, portas personalizadas e URLs com credenciais. DNS resolvido é fixado na conexão para evitar rebinding.
- Até 2 MB de HTML, 8 MB por recurso, 45 MB totais, 70 espaços de mídia, 40 seções e 40 folhas de estilo. API encerra a captura em 45 segundos; uma importação global por vez e uma tentativa por conta por minuto.
- HTML/CSS saneados e isolados em Shadow DOM. Sem script, srcdoc, handlers inline, URLs CSS externas ou formulários que enviem dados à origem. YouTube sem cookies/Vimeo têm somente os embeds compatíveis permitidos.
- Inserção da página e mídias é atômica no PostgreSQL. Cada espaço possui sua mídia atual; substituição não cria biblioteca online. Rascunho não muda os arquivos da publicação; republicação remove binários públicos obsoletos. Duplicação mantém propriedade e arquivos independentes. Quotas existentes de 100 MB por conta são respeitadas.
- Assets fixos do catálogo são compartilhados para permitir novas páginas futuras. Não são cópias antigas de uploads pessoais. Backups seguem a retenção operacional existente.
- Aplicativo DEV com teto de **2 GB**, solicitado pelo proprietário; CPU mantida em 0,25. Banco DEV, produção e serviços Sistera mantêm seus limites. Os 2 GB são limite máximo, não reserva permanente.

## Reproduzir e verificar

```bash
pnpm install --frozen-lockfile
node scripts/test-page-import.mjs
node scripts/test-import-store.mjs
pnpm lint
pnpm build
```

O CI executa `test-import-store.mjs` também em schema exclusivo de `hubpages_ci`, além dos contratos nativos e integrações existentes. O teste cobre gravação atômica, propriedade, revisão, publicação, substituição, duplicação independente, aposentadoria de URL, limpeza de slot e autoria exclusiva.

Para renovar a captura autorizada (precisa de rede), execute `node scripts/capture-sabor.mjs`. Os arquivos temporários ficam em `work/import-preview`, ignorado pelo Git. `node scripts/build-sabor-template.mjs` aplica o mapa de tradução e o mapeamento SHA-256 das artes localizadas. Se a origem mudar, revise traduções/lettering e recapture as miniaturas antes de atualizar o catálogo. O build falha se houver texto novo sem tradução.

Em implantação DEV, `server/provision-sabor-demo.mjs` provisiona o exemplo após o app saudável, usando o banco DEV e sem imprimir credenciais. Não executar o script no ambiente de produção.

Evidências locais sintéticas: `docs/evidence/hp036/`. A captura local foi importada pela interface, teve texto editado, checkout configurado, revisão obrigatória, publicação, seção duplicada e desfazer; modelo Sabor foi escolhido com Oceano e conferido em 390 px sem corte lateral. Nenhum checkout foi aberto para compra e nenhum Pixel real foi usado no teste local.

As especificações e caminhos das artes localizadas estão em [ARTES_SABOR.md](ARTES_SABOR.md).
