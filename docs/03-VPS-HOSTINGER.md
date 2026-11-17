# VPS Hostinger e isolamento

## Destino

- VPS Hostinger: KVM 2, Ubuntu 24.04 LTS.
- IPv4: `179.199.148.219`.
- Capacidade: 2 vCPUs, 8 GB de RAM e 102 GB de disco.
- Uso observado em 15/11/2026: aproximadamente 5% de CPU, 2,1 GB de RAM e 31 GB de disco.

## Separação do Sistera

A HubPages não reutiliza imagens, containers, volumes, bancos, diretórios de runtime nem projetos Compose do Sistera.

| Recurso | Homologação | Produção |
| --- | --- | --- |
| Projeto Compose | `hubpages_dev` | `hubpages_prod` |
| Checkout | `/opt/hubpages-src-dev` | `/opt/hubpages-src-prod` |
| Branch | `develop` | `main` |
| Imagem | `hubpages-dev:<commit>` | `hubpages-prod:<commit>` |
| Alias no proxy | `hubpages-dev` | `hubpages-prod` |
| Volume de conteúdo | `hubpages_dev_content` | `hubpages_prod_content` |
| Limite | 0,25 CPU / 128 MB | 0,25 CPU / 128 MB |

Os containers executam com usuário sem privilégios, filesystem do aplicativo somente leitura, capabilities
removidas, `no-new-privileges`, limite de processos e logs rotacionados. Apenas `/data` recebe um volume gravável
exclusivo para o conteúdo aprovado no painel administrativo.

## Rede

Os containers entram somente na rede externa do Caddy, `sistera_vps_sistera_internal`, para receber tráfego do
proxy. Eles não entram nas redes internas dos bancos do Sistera. A imagem contém apenas arquivos estáticos e um
servidor Caddy sem privilégios.

## Ordem segura de implantação

1. Criar o repositório e publicar `main` e `develop`.
2. Configurar uma chave SSH exclusiva e restrita ao gateway `hubpages-deploy-gateway`.
3. Executar `deploy/install-vps.sh` para criar os checkouts e containers.
4. Confirmar os health checks internos e o health check público do Sistera.
5. Apontar `hubpages.com.br`, `www` e `dev.hubpages.com.br` para `179.199.148.219`.
6. Executar `deploy/configure-proxy.sh`.
7. O script faz backup do Caddyfile, valida a configuração completa, recarrega sem reiniciar e restaura o backup
   automaticamente se o reload falhar.
8. Validar HTTPS e confirmar novamente a saúde do Sistera.

## Hospedagem web anteriormente provisionada

Os websites vazios criados inicialmente no plano de hospedagem compartilhada não serão usados para o deploy.
Eles não devem ser removidos até a conclusão da virada para a VPS; a remoção é uma ação separada e destrutiva.

## Estado implantado em 16/11/2026

- Checkout de produção criado em `/opt/hubpages-src-prod`, branch `main`.
- Checkout de homologação criado em `/opt/hubpages-src-dev`, branch `develop`.
- Projetos `hubpages_prod` e `hubpages_dev` ativos e saudáveis.
- Imagens em execução construídas a partir do commit `b700eaefee62`.
- Chave administrativa de bootstrap revogada após a instalação.
- Chave de deploy permanente restrita ao gateway e aos comandos `dev`, `prod` e `status`.
- Comandos arbitrários testados e rejeitados pelo gateway.
- Health check do Sistera validado antes e depois da implantação.
- Segredos `VPS_SSH_PRIVATE_KEY` e `VPS_SSH_KNOWN_HOSTS` armazenados como GitHub Actions Secrets.
- Deploy automático validado em `main` (produção, execução `43867755030`) e `develop` (homologação,
  execução `43867941526`).

## Virada pública concluída em 16/11/2026

- `hubpages.com.br` e `www.hubpages.com.br` encaminham para `hubpages-prod:8080`.
- `dev.hubpages.com.br` e `www.dev.hubpages.com.br` encaminham para `hubpages-dev:8080`.
- Registros `A` de `@` e `dev` apontam para `179.199.148.219`.
- `www` é um `CNAME` de `hubpages.com.br` e `www.dev` permanece um `CNAME` de `dev.hubpages.com.br`.
- Registros `ftp` foram preservados sem alteração.
- Snapshot DNS anterior à virada: `197224764`.
- Snapshots gerados pela virada: `197348305` (remoção seletiva) e `197348316` (inclusão seletiva).
- Backup do proxy antes da inclusão dos blocos HubPages:
  `/opt/sistera-vps/releases/20260908-r2/app/Caddyfile.before-hubpages-20261116T125534Z`.
- Certificados HTTPS emitidos pelo Caddy para os quatro hosts e redirecionamento HTTP `308` validado.
- A rota `/infancia_alem_das_telas` respondeu `200` em produção.
- O endpoint `https://app.sistera.com.br/api/health` permaneceu saudável durante toda a virada.
- A chave root temporária usada na manutenção foi removida ao final.
