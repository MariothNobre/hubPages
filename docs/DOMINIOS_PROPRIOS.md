# Domínio próprio — DEV e produção

Versão 0.12.1 / HP-056/057. Recurso inicialmente entregue apenas no DEV em HP-052/053; promoção para produção autorizada em 22/11/2026. Cada ambiente conserva seu banco, páginas, usuários e vínculos. Teste real autorizado no DEV: teste.sistera.com.br, DNS HostGator.

## Guia de uso

Regra 0.12.2: **qualquer subdomínio público válido pode iniciar a conexão**, nos dois ambientes, sem domínio pai previamente conectado e sem aprovação individual da administração. Exemplos: infancia.sistera.com.br, site.sistera.com.br, campanha.seudominio.com.br. Não há reserva genérica por sufixo, nem exceção pontual por nome. O primeiro passo gera instruções mesmo sem A/TXT configurados. Isso não comprova propriedade nem publica a página: TXT, apontamento e HTTPS próprios continuam obrigatórios antes da ativação.

Na página do Studio, abra Endereço → Conectar meu domínio.

1. **Escolha o endereço.** Digite o domínio registrado ou um subdomínio. Se o endereço principal já tem site ou e-mail, prefira oferta.seudominio.com.br. Cada nome (com/sem www) é uma conexão separada.
2. **Abra seu painel.** Escolha Hostinger, HostGator, Registro.br, GoDaddy, Cloudflare ou Outro provedor. O guia mostra o caminho dos menus e o link oficial. O sistema tenta identificar quem administra o DNS pelos servidores NS, pois o registrador e o DNS podem ser empresas diferentes.
3. **Copie e cole.** O TXT _hubpages.<endereço> contém um código exclusivo de propriedade. O A do endereço escolhido aponta para 179.199.148.219. O painel fornece nome completo e nome curto; usar um deles conforme o provedor, sem duplicar o domínio. Copiar mostra confirmação, com alternativa manual. Manter os registros de e-mail e os servidores DNS existentes; não criar destinos A/CNAME conflitantes. TTL padrão do provedor.
4. **Confira a conexão.** Há indicadores separados de propriedade TXT, apontamento A e HTTPS. IPv6 ou destinos diferentes, TXT ausente e falhas temporárias são apresentados com orientação. Somente DNS aprovado habilita a emissão do certificado. Propagação pode levar minutos ou até 48 horas, conforme provedor/cache. Cloudflare deve estar em Somente DNS; restrições CAA precisam permitir o certificado.
5. **Use seu domínio.** Após DNS e HTTPS conferidos, vincule o endereço. Vá para Revisão e publique a página. Conectar um rascunho não o publica; o domínio mostra somente o snapshot publicado. Editar mantém a versão pública até republicar. Retirar do ar/lixeira interrompe a página também no domínio. Desconectar preserva a publicação e os dados da página.

O endereço personalizado serve a raiz do hostname. **Subdomínios de domínio ativo e verificado da mesma conta não têm limite fixo de quantidade**, por página ou conta. Cada hostname exige seu próprio TXT, apontamento e HTTPS. Novos domínios independentes conservam a quota de 3 por página e 10 por conta; ela não conta os subdomínios associados à base já conectada. Há até 20 solicitações de preparo por minuto por conta, sem limite total de subdomínios. Desconectar libera o nome; reconectar gera prova nova.

A base é a zona DNS da conexão ativa/verificada; se ela não foi descoberta, usa-se o hostname já verificado, sem inventar um domínio pai. Ela serve somente para isenção de quota, nunca como requisito para preparar um endereço. Uma conta não herda a prova ou a isenção de outra, nem uma conexão expirada/desligada concede novas isenções. Apenas os nomes exatos dos serviços atuais são protegidos: hubpages.com.br, www.hubpages.com.br, dev.hubpages.com.br, sistera.com.br, www.sistera.com.br e app.sistera.com.br. Seus demais subdomínios seguem o fluxo normal de prova própria, sem liberação manual.

## Implementação e isolamento

- Flag HUBPAGES_CUSTOM_DOMAINS_ENABLED exige um ambiente Studio válido (DEV ou produção), origem configurada e plataforma habilitada. Sem flag, não cria tabela nem rotas ativas. Configuração efetiva anunciada no JSON da plataforma. A produção recebe a flag na promoção autorizada.
- Migração 010 aditiva em cada PostgreSQL isolado (DEV/produção): hubpages_studio_domains referencia a página e guarda prova/estado DNS/TLS. Unicidade global apenas para conexão verificada; pendência sem prova não reserva o domínio para sempre. Permissões por proprietário e página em todas as ações.
- Revalidação DNS a cada 15 minutos em lotes das conexões mais antigas; lease máximo de 24 horas. Divergência conhecida revoga a conexão; falha transitória não estende o lease anterior. Quatro verificações externas simultâneas no máximo, uma por conta, com intervalo por conexão.
- Certificados Caddy on-demand usam autorização por consulta indexada ao banco, sem DNS no endpoint de autorização. Propriedade TXT e apontamento exclusivo precisam estar aprovados. Probe HTTPS fixa o IP da HubPages, valida o certificado e não segue redirects. Nenhum fetch arbitrário ou porta customizada.
- Rota adicional no proxy compartilhado preserva os blocos existentes, recusa conflito de política/catch-all, valida com Caddy e guarda backup protegido antes de reload. A promoção converte apenas os blocos gerenciados DEV para roteamento por ambiente: produção autoriza seus próprios nomes primeiro, consultando o DEV somente para nomes não pertencentes à produção. Destinos internos são fixos; cabeçalhos enviados pelo visitante são descartados. Domínios da produção não dependem da disponibilidade do DEV. Health de DEV, produção e Sistera antes/depois e rollback do acréscimo em falha.
- Domínios próprios não expõem /studio, /admin, /entrar nem APIs privadas. Apenas publicação atual, assets públicos e prova de conexão. Sem cookies de login compartilhados entre hostnames.
- Pixel/CAPI e métricas aceitam somente o domínio e a publicação ligados à página. Métricas agregam ao mesmo ID; cada acesso continua contando. Mídias públicas mantêm o snapshot; chamadas cruzadas entre páginas são recusadas.
- Os domínios do DEV recebem noindex. A produção serve a página sem a regra global de noindex do DEV. O endereço HubPages da página continua independente; a conexão não modifica snapshots nem copia páginas/usuários entre ambientes.

## Cards, compartilhamento e desvinculação

- Minhas páginas, em Cards ou Lista: informa **Domínio próprio vinculado**, mostra os endereços ativos, abre a página publicada em nova aba e oculta somente nesse card o atalho HubPages. Rascunhos mostram orientação para publicar. Vínculos sem prova válida, expirados ou desligados não são apresentados como ativos.
- **Desvincular domínio** abre confirmação customizada. Após confirmar, o nome fica livre, sua autorização TLS é removida e o card volta ao link HubPages. Para usar em outra página, conecte nela com a nova prova TXT. A publicação e os conteúdos existentes são preservados.
- Assistente: card do domínio ativo em verde claro, inclusive selecionado/hover, e passo 5 **Use seu domínio** marcado com ✓ após vínculo válido.
- Publicação: **Seu link para compartilhar** mostra o domínio próprio no ar e também o endereço HubPages. Os dois são clicáveis em nova aba.

## Testes

- test-custom-domains.mjs: nomes/IDN, TXT/A/AAAA, NS, confirmação de DNS, isolamento, emissão inicial, ativação, expiração, disputa entre contas, retirada do ar e reconexão. Arquivo e PostgreSQL isolado no CI.
- test-custom-domain-http.mjs: hostname próprio, bloqueio de rotas privadas, prova/ask, métricas/CAPI vinculadas, expiração/desconexão/unpublish, flag habilitada na produção e recusa com a flag desligada.
- test-domains-proxy.py e validação Caddy em contêiner sem rede: preservação dos sites existentes, idempotência e recusa de conflito.
- Regra de subdomínios: teste cria 15 subdomínios na mesma página após validar a base, conserva prova individual, recusa herança entre contas/âncora desconectada e mantém quotas de domínios independentes e rate-limit. Repete em arquivo e PostgreSQL isolado.
- QA local: HostGator selecionada, cópia TXT funcionando, A aprovado/TXT ausente diagnosticado, registro persistido após F5. Sem overflow em desktop e 390×844. Evidências em docs/evidence/hp052. Valores TXT dessas capturas são de fixture local e não devem ser usados no DNS real.
- Provisionamento técnico DEV cria somente a página marcada Teste — domínio próprio e sua conexão. Idempotente, não sobrescreve a página ou reativa uma conexão que o proprietário desconectou. TXT real é gerado na VPS; resultado externo registrado na entrega HP-053.

## Validação real — HP-053

Em 22/11/2026, `https://teste.sistera.com.br` foi conectado ao DEV com DNS administrado na HostGator. O registro A já configurado pelo proprietário foi preservado; acrescentado somente TXT `_hubpages.teste` com TTL 300. A prova de propriedade, o apontamento e o HTTPS foram aprovados, e a página técnica **Teste — domínio próprio** está publicada nesse hostname. Evidência: `docs/evidence/hp052/dominio-real-https.jpg`.

Esse endereço está vinculado à página técnica de teste. Para usá-lo em outra página, primeiro desconecte-o nessa página pelo assistente; depois conecte-o na página desejada e use o novo TXT gerado. Isso evita trocar a página de destino acidentalmente. Não é necessário alterar o site ou e-mail de sistera.com.br.

Certificado Let's Encrypt YE2, CN teste.sistera.com.br, válido até 20/02/2027, autorizado pelo cliente TLS. A publicação recebe `noindex, nofollow, noarchive`. Solicitação de certificado para hostname sem prova retorna 403. Renovação/emissão permanece sob o Caddy e sua política de autorização.

Na entrega HP-053 a produção permaneceu em 0.11.1; a promoção posterior é registrada em HP-055. A conexão real foi testada na HostGator; os demais provedores têm guias e validação DNS comum, sem alegar teste real em cada conta/provedor.

## Fontes oficiais

- Hostinger: https://www.hostinger.com/br/support/4468886-como-adicionar-e-remover-um-registro-a-no-hpanel-hostinger/
- HostGator: https://suporte.hostgator.com.br/hc/pt-br/articles/30813120385427-Como-criar-ou-alterar-um-registro-A-MX-TXT-CNAME-e-outros-na-Zona-DNS
- Registro.br: https://registro.br/tecnologia/caracteristicas-tecnicas/
- GoDaddy: https://www.godaddy.com/pt-br/help/adicionar-um-registro-txt-19232
- Cloudflare: https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/
- Caddy: https://caddyserver.com/docs/caddyfile/options#on-demand-tls e https://caddyserver.com/docs/caddyfile/directives/tls
- Roteamento: https://caddyserver.com/docs/caddyfile/directives/forward_auth e https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
