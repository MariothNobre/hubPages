# Painel administrativo

## Escopo inicial

O painel fica disponível em `/admin` e permite editar os campos comerciais liberados da página
`/infancia_alem_das_telas`:

- Red Line;
- linha de contexto;
- título principal;
- texto de abertura;
- texto do botão;
- link HTTPS do checkout Hotmart.

O painel não permite editar código, scripts, HTML arbitrário, configuração da VPS ou dados do Sistera.

## Administrador inicial

O e-mail autorizado será configurado somente no arquivo secreto do servidor. O endereço não é gravado no código
público nem no frontend.

O valor real é aplicado diretamente na VPS durante a publicação e não deve aparecer no repositório.

## Primeiro acesso

1. O servidor recebe um hash de código de ativação de uso único.
2. Ao abrir `/admin`, o sistema identifica que ainda não existe senha e mostra o formulário de ativação.
3. O administrador informa o e-mail cadastrado, o código e uma nova senha com pelo menos 12 caracteres.
4. O servidor grava somente o hash `scrypt` da senha no volume privado do ambiente.
5. O código de ativação deixa de funcionar imediatamente.
6. Os acessos seguintes usam e-mail e senha.

O código de ativação em texto puro nunca deve ser salvo no GitHub, em arquivo de projeto ou em log.

## Proteções implementadas

- senha e código de ativação armazenados somente como hash `scrypt`;
- cookie de sessão `HttpOnly`, `Secure` e `SameSite=Strict`;
- validade de oito horas para a sessão;
- validação de origem nas operações de escrita;
- limite de tentativas de autenticação por endereço de rede;
- limite de tamanho e validação dos campos editáveis;
- somente links `https://` da Hotmart ou âncoras internas são aceitos;
- gravação atômica do conteúdo em volume Docker separado;
- volumes, credenciais e conteúdo separados entre DEV e produção;
- cabeçalhos CSP, anti-frame e `nosniff`.

## Segredos por ambiente

Os arquivos abaixo existem apenas na VPS, com permissão `0600`, e nunca entram no repositório:

```text
/opt/hubpages-secrets/dev.env
/opt/hubpages-secrets/prod.env
```

Cada arquivo contém:

```text
HUBPAGES_ADMIN_EMAIL=<email autorizado>
HUBPAGES_BOOTSTRAP_TOKEN_HASH=<hash scrypt do código de primeiro acesso>
HUBPAGES_SESSION_SECRET=<segredo aleatório exclusivo do ambiente>
```

DEV e produção devem usar códigos e segredos diferentes.

## Persistência

- DEV: volume `hubpages_dev_content`.
- Produção: volume `hubpages_prod_content`.

Os dados do painel não usam banco, volume, rede privada ou credenciais do Sistera.

## Testes executados

- build e verificação TypeScript;
- lint;
- health check da API;
- sessão inicialmente anônima;
- rejeição de senha e código incorretos;
- ativação de primeiro acesso;
- impossibilidade de reutilizar o código;
- login após ativação;
- leitura e gravação de conteúdo;
- bloqueio de origem não autorizada.

