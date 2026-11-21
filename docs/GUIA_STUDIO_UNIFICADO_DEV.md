# Studio unificado — DEV

Implementação de 20/11/2026; atualização de contadores v0.7.0-dev.12 publicada em DEV. Escopo: `dev.hubpages.com.br`. Não publicar em main/produção sem nova aprovação.

## Criar, editar e publicar

1. Entre pelo acesso existente em `/admin` ou pela conta de cliente em `/conta`. `/admin` abre o Studio; a identidade administrativa e sua senha são mantidas.
2. Clique em **Criar minha página de vendas**. O único modelo oferecido no catálogo é Infância Além das Telas. Rascunhos antigos Essencial/Coleção continuam editáveis.
3. Todas as etapas começam sem conclusão. Conteúdo pré-preenchido e endereço sugerido não significam que o usuário os conferiu. Entrar em uma etapa ou editar nela registra a visita em `draft.visitedSteps`; ela só fica pronta quando seus dados também são válidos. Revisão exige conferência, Publicação exige versão atual publicada. “Você está aqui” identifica a etapa aberta.
4. Clique na imagem do modelo para explorar a página completa na janela de prévia. Mouse/foco de teclado exibe as quatro capturas reais em leque. O modelo atual recebe destaque e **Modelo Escolhido**.
5. Personalize no Conteúdo e conecte o checkout. Pixel/credenciais pertencem exclusivamente à página editada. A prévia não envia métricas ou eventos Meta.
6. Escolha o trecho final do endereço, confira a disponibilidade e revise nos dispositivos. Clique no endereço para abrir outra aba.
7. Publique. O botão verde envia as alterações; o vermelho à esquerda retira a página do ar. Editar mantém o snapshot público anterior até republicar. Alterar o endereço e publicar retira o anterior, sem redirecionamento.
8. Atualizar o navegador conserva a página e a etapa via `/studio?page=UUID&step=N`. Salve as alterações antes de sair. **Minhas páginas** conclui o salvamento antes de voltar à lista.

## Minhas páginas e métricas

- Cards: duas colunas no desktop e uma no celular; capas atuais, status, acessos, online e ações. Lista: linhas com ações agrupadas. A preferência pertence à conta e é gravada no PostgreSQL.
- **Ver métricas**: totais, online, últimos 30 dias, gráficos por dia/hora, horários de maior/menor acesso e mapa semanal, no horário de Brasília. Atualiza a cada 5 segundos enquanto o painel está visível.
- Cada abertura, retorno à página ou atualização (F5) registra um novo acesso, inclusive do mesmo visitante. Não há janela de 30 minutos. Heartbeats e alternância entre abas não acrescentam acessos. O ID de cada carregamento evita apenas contar novamente o reenvio de uma mesma requisição, inclusive o replay de efeitos do React; não deduplica visitantes.
- Online são navegadores com a página aberta e heartbeat nos últimos 90 segundos, inclusive em aba em segundo plano. Várias abas do mesmo navegador contam uma pessoa online. O tracker envia presença a cada 15 segundos. Navegar para fora/fechar envia saída quando o navegador permite; interrupção abrupta ou suspensão sem sinal expira em até 90 segundos, mais a atualização do painel. Eventos têm sequência para impedir que um heartbeat atrasado reative uma aba fechada.
- A nova regra vale para acessos recebidos após a atualização. Totais e agregados anteriores são mantidos; acessos descartados pelo antigo intervalo não podem ser recuperados retroativamente.
- Medição apenas da URL publicada. Admin, editor e prévias não montam o tracker e seus Referers são rejeitados pela API. Identificadores são hashes no banco; não se grava IP na tabela de métricas. Não é medição antifraude/bots avançada.
- Totais antigos PT/ES são preservados. O sistema anterior não guardava horários/dias: o detalhamento começa nesta atualização e não reconstrói histórico inexistente.

## Lixeira e perfil

- Excluir página move para a lixeira, retirando publicação. Restaurar volta como rascunho.
- **Excluir permanentemente** abre modal próprio e exige digitar `EXCLUIR`. A API valida proprietário, revisão e estado na lixeira; só então elimina conteúdo, versões, imagens, snapshots, credenciais e métricas da página. Não elimina a conta. Backups administrativos seguem sua retenção normal.
- **Meu Perfil** permite nome, e-mail e senha; exige a senha atual. Nenhuma credencial real foi alterada durante a implementação. Cabeçalho: Site HubPages, Meu Perfil, Sair. Rodapé do sistema: © HubPages 2026 - Todos os Direitos Reservados.

## Migração e operação

1. Executar CI: lint, geração determinística, fidelidade HTML PT e ES, regressões, teste workspace em arquivo e em schema PostgreSQL exclusivo por execução dentro de `hubpages_ci`. O teste nunca remove schemas existentes e nunca pode apontar ao banco da aplicação.
2. Deploy develop usa o fluxo restrito DEV, com dump/restauração isolada antes e depois. A migração SQL 005 é aditiva: preferências, vínculos de legado, agregados horários, presença e tombstones de exclusão. A 006 acrescenta recibos de carregamento e sequência/estado de presença. Recibos técnicos são retidos por 7 dias; os totais agregados são preservados. A antiga tabela de deduplicação por visitante permanece para compatibilidade, sem limitar novos acessos.
3. `HUBPAGES_STUDIO_UNIFIED_ENABLED=true` somente no Compose DEV. A adoção inicial ocorre em transação e uma vez por slug: copia conteúdo dinâmico, URL equivalente no domínio DEV, status, Pixel, token cifrado, código de teste e total anterior. Conteúdo estático vem dos renderizadores derivados dos originais; os originais PT/ES, CSS e ativos existentes permanecem congelados.
4. O vínculo desativa o resolvedor/editor legado para essas páginas. Os snapshots Studio passam a responder na URL existente; uma página excluída/movida não pode ressurgir pelo fallback legado. Tombstone preservado após exclusão impede reimportação no restart.
5. A fonte antiga permanece preservada para auditoria, exceto se o usuário confirmar exclusão permanente da própria página. Não editar essa cópia antiga: ela não acompanha mudanças posteriores no Studio.
6. Preferir correção à frente. Reverter apenas a imagem ou desligar o flag sem reconciliar o conteúdo reativaria cópias antigas. Se uma reversão for necessária, restaurar banco e imagem juntos a partir do backup anterior, considerando edições posteriores antes de qualquer restauração. Não aplicar rollback automático destrutivo.

## Evidências locais

- `docs/evidence/hp021/progresso-inicial.jpg`: 0/7 etapas, não visitadas A fazer, hint legível.
- `docs/evidence/hp021/cards.jpg`: duas colunas, capas, indicadores e ações.
- `docs/evidence/hp021/modelo-completo.jpg`: modal com template integral.
- `docs/evidence/hp021/metricas.jpg`: relatório com total legado e início do detalhamento.

As capturas usam exclusivamente dados sintéticos locais. Não foram criadas/excluídas páginas reais para testar o recurso.


## Fluxo refinado — v0.7.0-dev.14

- O acesso principal é `/entrar`, com a apresentação **Entre no HubPages**. Aceita as contas existentes e mantém sua identidade/propriedade; `/admin` fica reservado às credenciais administrativas do SuperAdmin. O rótulo Plano Ouro no cabeçalho é a apresentação solicitada, sem criação de cobrança nem novos privilégios.
- **Sair** encerra a sessão no servidor, expira os cookies de cliente e administrador e abre `/entrar` em um documento novo. Sessões administrativas encerradas ficam revogadas também após reiniciar o serviço.
- **Criar minha página de vendas** aparece somente na lista **Páginas Criadas no Studio**. Enquanto o nome continuar Minha nova página, o endereço recebe um sufixo numérico aleatório de 3 a 6 dígitos, com disponibilidade verificada globalmente. Não é um identificador sequencial. O UUID interno da página permanece independente.
- Não existe mais Salvar agora: as edições são salvas automaticamente. A toolbar do Conteúdo começa com **Desfazer**, seguido de **Cards e recursos**. Cada seção oferece **Duplicar bloco**, **Layout do bloco** e configurações locais onde houver quantidades/recursos opcionais.
- Duplicar cria outro bloco com ID próprio, copia sua mídia atual quando enviada e preserva o layout do template. Textos da cópia podem ser alterados independentemente. A duplicação participa do Desfazer e respeita o limite de 40 blocos.
- O guia Recolher guia/Ver como fazer usa a mesma preferência em todas as etapas e páginas do usuário, salva no servidor. O modo Cards/Lista continua preservado. Migração 008 adiciona a preferência sem alterar os dados existentes.
- Para publicar, confira a etapa Revisão e marque a caixinha de conferência. Qualquer nova alteração de conteúdo ou arquivo invalida essa confirmação. Cliente e servidor verificam a revisão; clicar em publicar sem confirmar abre uma janela explicativa.
- Endereço ocupado recebe contorno e mensagem destacados e impede publicação. Se esse conflito impedir voltar à lista, a janela oferece **Usar endereço disponível e voltar**: mantém as outras alterações e salva com uma alternativa disponível. Não descarta o rascunho.
- Após publicar, a comparação usa o rascunho canônico salvo no servidor e limpa as pendências, inclusive URLs com barra final normalizada.
- Vídeos têm autoplay, loop e áudio habilitado. Se o navegador bloquear reprodução com som, aparece **Reproduzir com som**; a plataforma não pode remover essa restrição do navegador. As miniaturas não iniciam outra reprodução.
- Botão direito fora dos campos exibe o aviso de direitos autorais solicitado. Nos campos de texto permanece disponível o menu de edição; Ctrl+C/Ctrl+V e colagem de texto continuam funcionando. O aviso é um recurso da interface.


## Disponibilidade em produção

Após a promoção v0.7.0, entre em https://hubpages.com.br/entrar com seu acesso de produção. DEV continua em https://dev.hubpages.com.br/entrar para homologação. Cada ambiente mostra suas próprias páginas, usuários e estatísticas. O conteúdo de teste do DEV não é transferido. Publicação está temporariamente gratuita até a integração de cobrança.

Publicar alterações usa verde suave. Quando a página está no ar, o bloco do link acompanha a cor verde do resumo e o botão Alterar endereço aparece abaixo do link.
