# Como adicionar um novo ebook

## Convenção de URL

Use letras minúsculas e `_` entre palavras, conforme o padrão inicial:

```text
/infancia_alem_das_telas
```

Não use acentos, espaços ou parâmetros para identificar o produto.

## Passo a passo

1. Crie uma branch `feature/ebook-<slug>` a partir de `develop`.
2. Crie a página React em `src/pages/<NomeDoEbook>/` quando a estrutura por páginas for introduzida.
3. Registre a rota no aplicativo.
4. Defina título, descrição, imagem social e URL canônica.
5. Implemente Red Line, benefícios, prova, oferta, garantia, FAQ e CTAs.
6. Configure o checkout por variável pública e nunca exponha tokens secretos.
7. Verifique desktop, tablet e celular.
8. Teste a rota diretamente, atualizando o navegador para validar o fallback da Hostinger.
9. Faça pull request para `develop` e homologue no DEV.
10. Promova para `main` somente após a aprovação final.

## Checklist comercial

- Promessa específica e responsável.
- CTA claro e consistente.
- Informações de preço e garantia sem ambiguidade.
- Política de privacidade e termos aplicáveis.
- Métricas e pixels configurados com consentimento quando necessário.
- Checkout e entrega testados de ponta a ponta.

