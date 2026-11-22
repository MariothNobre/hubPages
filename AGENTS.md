# Diretrizes de desenvolvimento da HubPages

## Domínios e subdomínios

Preserve a regra de negócio em `docs/DOMINIOS_PROPRIOS.md` e `server/domain-policy.mjs`: subdomínios de uma base ativa/verificada da mesma conta não têm quota total fixa. Cada hostname exige prova DNS/HTTPS própria. Não herdar bases de outra conta nem liberar serviços de infraestrutura. Quotas de novos domínios independentes e limites de solicitações/concorrência permanecem distintos da quantidade total de subdomínios. Execute `scripts/test-custom-domains.mjs` (arquivo e PostgreSQL CI) ao alterar esta regra.

## Importação de páginas de vendas

Antes de alterar o importador, consulte:

- `docs/IMPORTACAO_COMPATIBILIDADE_TECNOLOGICA.md`: padrões tecnológicos suportados, decisões e procedimento para novas compatibilidades.
- `docs/DIRETRIZES_TEMPLATES_E_EDITOR.md`: contrato de edição, mídia, marca, armazenamento e publicação.
- `docs/IMPORTACAO_E_MODELO_SABOR.md`: fluxo operacional e limites atuais.

Corrija por padrão tecnológico, com regressão offline em `scripts/test-page-import.mjs`, sem exceções baseadas em domínio. Preserve conteúdo/slots e identificadores CSS necessários por allowlist; não execute scripts, hidratação ou componentes remotos. Não enfraqueça as validações de rede e saneamento para contornar uma falha visual.

Ao modificar o comportamento da importação, confira no Studio o conteúdo visível e o salvamento após recarregar; receber HTTP 201 não basta. Registre novos padrões no guia de compatibilidade e a entrega em `docs/STEP_BY_STEP.md`. Respeite o ambiente autorizado pelo usuário e preserve os dados e o isolamento do Sistera.
