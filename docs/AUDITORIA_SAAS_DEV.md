# Auditoria da evolução administrativa — HP-060

Data: 22/11/2026 20:36 BRT. Autor: Codex. Escopo autorizado: exclusivamente DEV. Base: develop d96b2dc / runtime DEV de49c5b; produção runtime bb22b79, v0.12.2. Nenhuma promoção para main autorizada neste projeto.

## Inventário antes da implementação

| Área | Situação e evidência |
| --- | --- |
| Código | React 19, TypeScript, Vite, Node 22 ESM, PostgreSQL 17. Evolução dos módulos existentes, sem reescrita. |
| Identidades | hubpages_accounts/users/customer_sessions, scrypt e sessões opacas de 8h; admin legado em hubpages_state.payload.admin, cookie HMAC existente. Sem RBAC global, MFA, recuperação ou dispositivos confiáveis. |
| Admin principal | E-mail reservado no cadastro de clientes. Correspondência do admin legado e eventual usuário relacional deve ser confirmada no preflight DEV antes de conceder papéis. Não duplicar identidade nem alterar hash/sessões. |
| Persistência | Migrações 001–010: contas, páginas, revisões imutáveis, publicações e mídias, endereços, rastreamento privado cifrado, preferências, tráfego/presença e domínios. FK por proprietário, origem imutável e purga explícita. |
| Editor | Implementado: canvas, blocos, texto/cores, mídia corrente, Undo, checkout individual/global, degustação, prévia privada, revisão assinada, snapshots. Preservar integralmente. |
| Templates | Aurora PT, ES preservado e Sabor curado, seis paletas. Catálogo estático versionado em Git, sem central administrativa de matrizes. |
| Importação | Captura/saneamento HTTPS público com DNS/IP fixado, limites e HTML/CSS inertes. Origem persistida e edição por slots. Publicação hoje permitida nos endereços HubPages; novo prompt exige governança restritiva somente no DEV, preservando arquivos/snapshots antigos. |
| Domínios | TXT/A/HTTPS, cancelamento, desconexão, revalidação e isolamento. Roteamento compartilhado já operacional; não alterar proxy/DNS neste projeto. |
| Pixel/tráfego | Pixel/CAPI por página, token AES-GCM privado, deduplicação e métricas por hora/presença. Não há confirmação de vendas; não apresentar Purchase ou receita fictícia. |
| Comercial | Modelo Asaas previsto, configurado=false; sem integração financeira operacional. Ouro aparece na interface, sem catálogo/entitlements comerciais efetivos. |
| SMTP | Ausente. Segredos/conta de teste ainda dependem do proprietário. Preparar configuração cifrada e testes reais condicionais, sem anunciar envio como funcionando antes da validação. |
| Institucional | Layout/Brand/componentes preservados; comunicação atual orientada a ebooks. Atualizar conteúdo e seções somente no DEV. |
| Rotas | /entrar, /conta, /studio, /perfil, /admin, prévias privadas, resoluções públicas e aliases. Super Admin novo deve ter autorização no backend, não apenas menu. |
| Infraestrutura | Compose hubpages_dev/prod separados; volumes e redes PostgreSQL próprios, sem portas de banco no host. Rede de proxy e VPS compartilhadas com Sistera. App 2 GiB/0,25 CPU; DB 256 MiB/0,25 CPU. Não expor Docker socket ao app. |
| Backups | pg_dump + restore integral em contêiner efêmero sem rede antes do deploy DEV; logs HP-059 comprovam integridade. Novo preflight verificará mounts/projetos/redes efetivos e identidade sem imprimir segredos. |

## Baseline externa somente leitura

Health DEV, produção e Sistera: 200. Hashes públicos PT/ES coincidem com HP-059 (e96d2a4…769d0 e c3b72fb…b162d). Registro integral privado de hashes em work/saas-production-baseline.json, fora do Git. Main não será alterado; nenhum fluxo novo ficará ativo sem flag estritamente DEV.

## Riscos e decisões

1. Proxy compartilhado: retirar da esteira desta evolução qualquer chamada de modificação/reload do proxy. Verificar isolamento antes de backup/migração/build. Falha impede operação.
2. Conta principal: usar sujeito legado existente se confirmado; mapear papel em tabela aditiva, sem novo e-mail/hash/sessão. Ambiguidade de identidades falha de forma explícita.
3. Cobrança: sandbox fixo no backend; modelo comercial configurável e inicialmente desativado. Nenhuma cobrança dupla, real ou ativação por retorno de checkout. Credenciais não ficam no Git/logs.
4. Importadas: preservar conteúdo e histórico, mas novo gate DEV exige domínio próprio verificado e impede exposição pelos aliases da plataforma. Distinguir template curado HubPages de captura de terceiros pela origem imutável do servidor.
5. Segurança: sessões legadas mantidas; novos acessos passam pelo desafio servidor, verificação adicional e dispositivos revogáveis. Bootstrap de e-mail só para principal confirmado, DEV e com prazo explícito. Ações críticas exigem reautenticação.
6. Escopo externo: SMTP/Asaas reais de sandbox dependem de configuração e teste pelo proprietário; módulos devem informar pendência, sem simular resultados como reais.

## Sequência e aceite

Fase 0: preflight/read-only do banco, isolamento Docker, checkpoint privado e restore verificado. Depois RBAC/auditoria → autenticação/SMTP → Super Admin → planos/Asaas sandbox → governança de templates/importação → cliente/institucional → testes integrados e homologação. Cada fase atualiza STEP_BY_STEP e ARQUITETURA_SOFTWARE. Rollback por imagem/flag anterior, preservando migrações aditivas e dados; nunca DROP, TRUNCATE ou reset de volumes.

Estado: auditoria de código/documentação concluída antes de mudanças funcionais. Verificação privada atual de containers/conta será registrada após o preflight DEV. Sem alterações na produção.
