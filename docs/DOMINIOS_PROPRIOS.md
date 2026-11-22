# Domínio próprio — DEV

Versão 0.12.0-dev.1 / HP-052. Publicação deste recurso autorizada somente no DEV. A produção continua em 0.11.1, com a funcionalidade desabilitada. Teste real autorizado: teste.sistera.com.br, DNS HostGator.

## Guia de uso

Na página do Studio, abra Endereço → Conectar meu domínio.

1. **Escolha o endereço.** Digite o domínio registrado ou um subdomínio. Se o endereço principal já tem site ou e-mail, prefira oferta.seudominio.com.br. Cada nome (com/sem www) é uma conexão separada.
2. **Abra seu painel.** Escolha Hostinger, HostGator, Registro.br, GoDaddy, Cloudflare ou Outro provedor. O guia mostra o caminho dos menus e o link oficial. O sistema tenta identificar quem administra o DNS pelos servidores NS, pois o registrador e o DNS podem ser empresas diferentes.
3. **Copie e cole.** O TXT _hubpages.<endereço> contém um código exclusivo de propriedade. O A do endereço escolhido aponta para 179.199.148.219. O painel fornece nome completo e nome curto; usar um deles conforme o provedor, sem duplicar o domínio. Copiar mostra confirmação, com alternativa manual. Manter os registros de e-mail e os servidores DNS existentes; não criar destinos A/CNAME conflitantes. TTL padrão do provedor.
4. **Confira a conexão.** Há indicadores separados de propriedade TXT, apontamento A e HTTPS. IPv6 ou destinos diferentes, TXT ausente e falhas temporárias são apresentados com orientação. Somente DNS aprovado habilita a emissão do certificado. Propagação pode levar minutos ou até 48 horas, conforme provedor/cache. Cloudflare deve estar em Somente DNS; restrições CAA precisam permitir o certificado.
5. **Use seu domínio.** Após DNS e HTTPS conferidos, vincule o endereço. Vá para Revisão e publique a página. Conectar um rascunho não o publica; o domínio mostra somente o snapshot publicado. Editar mantém a versão pública até republicar. Retirar do ar/lixeira interrompe a página também no domínio. Desconectar preserva a publicação e os dados da página.

O endereço personalizado serve a raiz do hostname. Até 3 nomes por página e 10 conexões pendentes/ativas por conta. Desconectar libera o nome e a quota; reconectar gera prova nova. Os endereços internos da plataforma são reservados, com exceção de teste.sistera.com.br explicitamente autorizada e configurada apenas no DEV.

## Implementação e isolamento

- Flag HUBPAGES_CUSTOM_DOMAINS_ENABLED só é aceita em development. Sem flag, não cria tabela nem rotas ativas. Configuração efetiva anunciada no JSON da plataforma. Nenhuma variável de produção foi alterada.
- Migração 010 aditiva no PostgreSQL DEV: hubpages_studio_domains referencia a página e guarda prova/estado DNS/TLS. Unicidade global apenas para conexão verificada; pendência sem prova não reserva o domínio para sempre. Permissões por proprietário e página em todas as ações.
- Revalidação DNS a cada 15 minutos em lotes das conexões mais antigas; lease máximo de 24 horas. Divergência conhecida revoga a conexão; falha transitória não estende o lease anterior. Quatro verificações externas simultâneas no máximo, uma por conta, com intervalo por conexão.
- Certificados Caddy on-demand usam autorização por consulta indexada ao banco, sem DNS no endpoint de autorização. Propriedade TXT e apontamento exclusivo precisam estar aprovados. Probe HTTPS fixa o IP da HubPages, valida o certificado e não segue redirects. Nenhum fetch arbitrário ou porta customizada.
- Rota adicional de domínios DEV no proxy compartilhado: preserva os blocos existentes, recusa conflito de política/catch-all, valida com Caddy e guarda backup protegido antes de reload. Health de DEV, produção e Sistera antes/depois; rollback do acréscimo em falha. Não muda serviços/recursos dos sistemas existentes.
- Domínios próprios não expõem /studio, /admin, /entrar nem APIs privadas. Apenas publicação atual, assets públicos e prova de conexão. Sem cookies de login compartilhados entre hostnames.
- Pixel/CAPI e métricas aceitam somente o domínio e a publicação ligados à página. Métricas agregam ao mesmo ID; cada acesso continua contando. Mídias públicas mantêm o snapshot; chamadas cruzadas entre páginas são recusadas.
- Os domínios do DEV recebem noindex. O endereço HubPages da página continua independente; a conexão não modifica snapshots nem copia páginas/usuários entre ambientes.

## Testes

- test-custom-domains.mjs: nomes/IDN, TXT/A/AAAA, NS, confirmação de DNS, isolamento, emissão inicial, ativação, expiração, disputa entre contas, retirada do ar e reconexão. Arquivo e PostgreSQL isolado no CI.
- test-custom-domain-http.mjs: hostname próprio, bloqueio de rotas privadas, prova/ask, métricas/CAPI vinculadas, expiração/desconexão/unpublish e flag desligada em produção.
- test-domains-proxy.py e validação Caddy em contêiner sem rede: preservação dos sites existentes, idempotência e recusa de conflito.
- QA local: HostGator selecionada, cópia TXT funcionando, A aprovado/TXT ausente diagnosticado, registro persistido após F5. Sem overflow em desktop e 390×844. Evidências em docs/evidence/hp052. Valores TXT dessas capturas são de fixture local e não devem ser usados no DNS real.
- Provisionamento técnico DEV cria somente a página marcada Teste — domínio próprio e sua conexão. Idempotente, não sobrescreve a página ou reativa uma conexão que o proprietário desconectou. TXT real é gerado na VPS; resultado externo registrado na entrega HP-053.

## Referências oficiais consultadas

- Hostinger: https://www.hostinger.com/br/support/4468886-como-adicionar-e-remover-um-registro-a-no-hpanel-hostinger/
- HostGator: https://suporte.hostgator.com.br/hc/pt-br/articles/30813120385427-Como-criar-ou-alterar-um-registro-A-MX-TXT-CNAME-e-outros-na-Zona-DNS
- Registro.br: https://registro.br/tecnologia/caracteristicas-tecnicas/
- GoDaddy: https://www.godaddy.com/pt-br/help/adicionar-um-registro-txt-19232
- Cloudflare: https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/
- Caddy: https://caddyserver.com/docs/caddyfile/options#on-demand-tls e https://caddyserver.com/docs/caddyfile/directives/tls
