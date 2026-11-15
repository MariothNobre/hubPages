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
| Limite | 0,25 CPU / 128 MB | 0,25 CPU / 128 MB |

Os containers executam com usuário sem privilégios, filesystem somente leitura, capabilities removidas,
`no-new-privileges`, limite de processos e logs rotacionados. Como o frontend atual é estático, nenhum volume de
dados é montado.

## Rede

Os containers entram somente na rede externa do Caddy, `sistera_vps_sistera_internal`, para receber tráfego do
proxy. Eles não entram nas redes internas dos bancos do Sistera. A imagem contém apenas arquivos estáticos e um
servidor Caddy sem privilégios.

## Ordem segura de implantação

1. Criar o repositório privado e publicar `main` e `develop`.
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
