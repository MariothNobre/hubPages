# HP-063 — Asaas Sandbox no DEV

Integração restrita ao gate SaaS do DEV e à API fixa https://api-sandbox.asaas.com/v3. Produção continua sem este módulo. Migração aditiva 012 preserva contas, senhas, sessões, páginas, pixels e domínios.

Configuração exclusiva Super Admin com reautenticação por senha atual e CSRF. Chave e token de webhook cifrados AES-256-GCM com contexto próprio; nunca retornados pela API, auditoria ou logs. Nenhum cartão é recebido pela HubPages. Não alterar segurança/saques da conta Asaas.

Webhook exige asaas-access-token antes de ler o corpo; registra somente identificador, tipo e referência, com unicidade por evento e fila persistente. Reconciliação consulta o estado atual na API, tolera duplicatas e eventos fora de ordem. Não altera permissões comerciais dos usuários atuais. Assinatura com franquia continua como modelo comercial; preços e franquias reais aguardam definição.

Entrega inicial: conexão protegida, provisionamento idempotente do webhook, diagnóstico e eventos conciliados, laboratório administrativo de assinatura mensal sintética de R$ 5,00, sem dinheiro real e sem associação a usuários reais. Criar/confirmar simulação somente por ação explícita. O laboratório não libera franquias reais nem muda publicação gratuita.

Validação: testes offline de rede fixa/criptografia/erros; PostgreSQL CI para persistência, RBAC, CSRF, reautenticação, idempotência e estados; build/lint; deploy somente develop; conexão real Sandbox depende de chave inserida no painel protegido.
