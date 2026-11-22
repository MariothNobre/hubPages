# Artes localizadas do modelo Sabor

As artes finais ficam em `public/assets/templates/sabor/`. Foram produzidas com a ferramenta de edição de imagens integrada (skill imagegen), usando cada arte pública da página autorizada como alvo da edição. Não foi usada API externa configurada no sistema HubPages. O importador comum não chama geração de imagens nem tradução automática: esse trabalho foi específico do modelo de teste solicitado.

## Especificação consolidada dos prompts

Para cada alvo: **traduzir somente o lettering em espanhol para português brasileiro; preservar fotografia, composição, cores, pessoas, nomes, números, selos e diagramação; não acrescentar alegações, pessoas, depoimentos, logotipos ou elementos promocionais. Manter o aspecto da arte original e entregar a arte completa.** A tradução deve caber no mesmo espaço e permanecer legível em desktop e celular.

| Arquivo final | Texto/objetivo específico da edição |
| --- | --- |
| produto-principal-pt.png | COMA BEM EM MINUTOS; Cozinha fácil, rápida e deliciosa; receitas, cardápios, listas e cinco bônus em português |
| colecao-pt.png | Traduzir títulos das capas e apresentação conjunta da coleção, mantendo quantidades e composição |
| depoimentos-pt.png | Traduzir os textos de avaliações já existentes; preservar pessoas, nomes, estrelas e números |
| comentarios-pt.png | Traduzir os comentários existentes, preservando a apresentação e os identificadores originais |
| clientes-pt.png | Traduzir os comentários existentes; correção final para “melhor investimento”, sem alterar a avaliação |
| bonus-colecao-pt.png | Nomes da coleção e dos cinco bônus em português, preservando capas e cenário |
| bonus-01-pt.png | COMA BEM E SAUDÁVEL; COLEÇÃO COMA BEM EM MINUTOS; BÔNUS ESPECIAL N.º 01 |
| bonus-02-pt.png | COMIDAS PARA LEVAR; COLEÇÃO COMA BEM EM MINUTOS; BÔNUS ESPECIAL N.º 02 |
| bonus-03-pt.png | CONVIDADOS DE ÚLTIMA HORA; Sabor e organização para receber em casa; BÔNUS ESPECIAL N.º 03 |
| bonus-04-pt.png | COZINHA FITNESS FÁCIL; COLEÇÃO COMA BEM EM MINUTOS; BÔNUS ESPECIAL N.º 04 |
| bonus-05-pt.png | GUIA DE CALORIAS E PORÇÕES; COLEÇÃO COMA BEM EM MINUTOS; BÔNUS ESPECIAL N.º 05 |
| garantia-pt.png | GARANTIA; 7 DIAS; DEVOLUÇÃO, traduzindo o selo existente sem ampliar suas condições |

Os textos HTML usam o mapa versionado `server/templates/sabor-translations.json`. A associação entre os arquivos originais e suas artes localizadas usa SHA-256 em `server/templates/sabor-media-localization.json`. Os demais arquivos `media-<hash>.webp/mp4` são fotografias e clipes originais preservados.

As quatro imagens `preview-hero/colecao/oferta/faq.jpg` são capturas reais do navegador, não mockups. As evidências de seleção e celular estão em `docs/evidence/hp036/`.
