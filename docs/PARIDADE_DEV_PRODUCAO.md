# Paridade de recursos DEV e produção

Atualização 0.12.2 / HP-058/059, autorizada pelo proprietário para ambos os ambientes. DEV usa dev.hubpages.com.br; produção usa hubpages.com.br. Bancos, contas, sessões, páginas, imagens privadas e Pixel permanecem próprios de cada ambiente.

| Recurso | DEV | Produção | Verificação |
| --- | --- | --- | --- |
| Studio, cadastro, perfil e sessão | Habilitado | Habilitado | test-workspace, test-customers |
| Catálogo Aurora/Sabor e temas | Habilitado | Habilitado | test-template-themes, catálogo na API |
| Importar uma página autorizada | Habilitado | Habilitado | POST protegido, HTTPS, limites e saneamento |
| Publicar página importada no endereço HubPages escolhido | Habilitado | Habilitado | captura fixture, criação e publishDraft nos dois domínios; API/publicação em arquivo/PostgreSQL |
| Edição de textos, cores, imagens/vídeos, caixas e blocos | Habilitado | Habilitado | contratos PT/ES, import-editor, workspace |
| Altura vertical, fundos compartilhados e Desfazer | Habilitado | Habilitado | DOM/ponteiro, persistência e snapshots públicos |
| Degustação, autor, visibilidade e botões/checkout | Habilitado | Habilitado | contratos e checkout-links |
| Prévia privada e revisão obrigatória | Habilitado | Habilitado | assinatura de revisão e isolamento do snapshot |
| Endereço disponível, publicar/retirar do ar, duplicar e lixeira | Habilitado | Habilitado | workspace e page-address |
| Pixel por página, API de Conversões e métricas de visitas/online | Habilitado | Habilitado | tracking, visitor-session e workspace |
| Domínio próprio, guia DNS e HTTPS | Habilitado | Habilitado | TXT/A, certificado, hostname/página/proprietário, router e isolamento |
| Preparar qualquer subdomínio público sem domínio pai conectado | Habilitado | Habilitado | API offline DEV/produção com infancia.sistera, política efetiva no config e prova própria |
| Cancelar configuração pendente | Habilitado | Habilitado | popup/F5, conta/página, novo TXT, resultados antigos e conexão ativa preservada |
| Subdomínios de base ativa/verificada sem quota total fixa | Habilitado | Habilitado | 15 subdomínios, isolamento, prova individual, quotas de domínios independentes e rate-limit |
| Card de domínio, desvinculação e links de compartilhamento | Habilitado | Habilitado | cards/lista, API, fluxo visual com F5 e nova prova ao reconectar |
| Publicação gratuita temporária | Habilitado | Habilitado | configuração do ambiente |

Asaas e envio/recuperação por e-mail ainda dependem de integração também no DEV; esta atualização não simula essas funções nem cria cobranças. O exemplo de teste privado Sabor do DEV não é copiado para contas de produção: o modelo está disponível no catálogo dos dois ambientes.

As proteções de importação continuam iguais: somente o documento autorizado, sem executar scripts/pixels da origem, HTTPS público verificado, limites de consumo, mídias por espaço e autorização por proprietário. Use Revisão e confira os links antes de publicar.

Consultar /api/customer/config para ambiente e features.studio, features.pageImport, features.freePublishing e features.customDomains efetivos. Não substitui teste do fluxo: CI exerce autorização/HTTPS/limites e publicação importada em DEV e produção, com arquivo e PostgreSQL isolado. O teste visual local confirma conteúdo e F5. Entregas e backups em STEP_BY_STEP.md HP-051, HP-055, HP-057 e HP-059.

O domínio teste.sistera.com.br permanece conectado somente ao DEV. A promoção não copia vínculos DNS, páginas ou usuários para produção. Cada domínio de produção deve ser conectado na página desejada no ambiente de produção.
