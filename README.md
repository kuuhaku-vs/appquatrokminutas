# Gerador de Minutas — Quatro K

Gera, registra e consulta as **minutas de despacho** (malotes) da Quatro K.
A base de dados é a planilha do Google **Gerador de Minutas - 4K**: numeração, histórico e exclusões
ficam lá, e todos os aparelhos veem a mesma coisa.

O mesmo código roda de dois jeitos:

| | App web (celular e navegador) | Programa do Windows |
|---|---|---|
| Onde abre | `https://kuuhaku-vs.github.io/appquatrokminutas/` | `GeradorMinuta.exe` |
| Precisa de | Internet | Internet (com o Google como base) |
| PDF | Imprimir › **Salvar como PDF** | Gerado e aberto automaticamente, com cópia no Drive |
| Cópia no `registro_itens.csv` | — | Sim, quando a pasta estiver acessível |

## Novidades da v4.0

- **Mais rápido para abrir**: com sessão guardada o app abre na hora e o Google confere o login em segundo plano; número, histórico e pedidos são buscados ao mesmo tempo (antes era um depois do outro). A tela de login aparece sem esperar o Google.
- **Mais rápido para salvar**: a gravação não consulta mais o número antes (a própria gravação confere a sequência) e o aviso de "salvo" não espera recarregar o histórico.
- **Script do Google 4.0**: consultas não esperam mais na fila do bloqueio (só o que grava espera), a conferência do cabeçalho/formato das abas é feita uma vez por versão em vez de em toda requisição, e a minuta nova entra no topo da aba sem reordenar a planilha inteira.
- **Consultas repetidas**: pedidos iguais feitos ao mesmo tempo viram uma ida só ao Google, e a busca do Histórico filtra o que já está carregado (antes cada letra baixava o histórico inteiro).
- **Usuários dentro de Configurações**: abas *Configurações | Usuários*, abertas pela engrenagem (o selo de cadastros aguardando aprovação aparece na engrenagem e na aba).
- **Login/cadastro compacto**: campos lado a lado no cadastro e o card nunca passa da altura da janela.
- **Correções**: aviso "Salvando…" que ficava preso; status da planilha marcado como inacessível antes do login; engrenagem sumia para quem só gerencia usuários.
- **Precisa do `GoogleSheets_Script.gs` 4.0 publicado** (o app continua funcionando com o 3.9, só sem os ganhos do script).

## Novidades da v3.9

- **E-mails saem de `amostra@quatrok.com.br`**: todos os avisos (malote despachado, pedidos incluídos/recusados/reabertos, comentários, lembretes e testes) usam a conta definida em `EMAIL_CONTA_ENVIO` no `GoogleSheets_Script.gs`. O ideal é publicar o script com essa conta. Se o script for publicado por outra conta, `amostra@quatrok.com.br` precisa estar em *Gmail › Configurações › Contas › Enviar e-mail como* dessa conta (o Google pede para autorizar o Gmail de novo: rode `testarEmail` no editor). Sem isso, o envio é recusado com uma mensagem explicando o que fazer.
- **E-mail obrigatório no usuário**: primeiro acesso, cadastro pela tela de login, *Usuários* (criar/alterar/aprovar) e *Minha conta* exigem um e-mail válido, que não pode repetir entre usuários. Usuário antigo sem e-mail precisa ter um informado na próxima alteração.
- **Envio › Quem está enviando** fica travado no usuário logado (o script do Google também grava sempre o nome de quem está logado). Assim o pedido fica ligado ao e-mail do cadastro dele.
- **Cabeçalho da minuta** não quebra mais: o status do rascunho foi para a linha do título e, quando falta espaço, os botões secundários viram só ícone.
- **Script na conta amostra@quatrok.com.br**: o App da Web agora é o projeto *Gerador de Minutas 4K (amostra)*, na conta amostra@, apontando para a planilha por `ID_PLANILHA`. A URL nova está no `config.js`; aparelhos com a URL antiga salva passam sozinhos para a nova (é preciso entrar de novo uma vez). No programa do Windows, cole a URL nova em Configurações.
- **Precisa do `GoogleSheets_Script.gs` 3.9 publicado no Apps Script.**

## Novidades da v3.5

- **Início**: painel que abre primeiro, com minutas do dia e do mês, volumes, pedidos aguardando, atalhos e últimas minutas. Cada perfil só vê o que pode usar. Atalho **Alt+0**.
- **Frete cortesia** virou uma aba dentro da **Nova minuta** (Minuta de despacho | Frete cortesia).
- **Configurações** fica na engrenagem ao lado do usuário (barra lateral e topo do celular).
- **Para quem vai**: janela de escolha com busca e destinatários recentes.
- Novo conteúdo **Desenvolvimento** nos pedidos e itens.
- No celular, a barra de baixo tem 4 telas + **Mais**.
- E-mail **Malote despachado**: ao registrar a minuta, abre a conferência de um aviso único com o malote inteiro, com todos os envolvidos já marcados (quem pediu, quem recebe cada item e quem está "Sempre em cópia"). Só sai depois de conferido (v3.6). Substitui o aviso de "pedido incluído". Botão **Avisar** na minuta, no Histórico e na janela de detalhes gera o aviso de qualquer minuta registrada, também com conferência (v3.7). O editor do modelo de e-mail mostra de qual conta os e-mails saem. **Precisa do `GoogleSheets_Script.gs` 3.7 publicado no Apps Script.**
- Programa do Windows mostra o ícone do Gerador na janela e na barra de tarefas (`icon.ico`).

## No celular
1. Abra `https://kuuhaku-vs.github.io/appquatrokminutas/` no Safari (iPhone) ou Chrome (Android).
2. Entre com seu **usuário e senha** (veja *Usuários e login*). Marque **Manter conectado** se o aparelho for só seu.
3. Vire app: iPhone → Compartilhar → **Adicionar à Tela de Início**; Android → ⋮ → **Instalar app**.

## Usuários e login
O app abre numa tela de login. Cada pessoa entra com o próprio usuário e senha, e o perfil dela define o que pode acessar e alterar.

**Ativar (uma vez):**
1. Publique a versão nova do `GoogleSheets_Script.gs` (veja *Atualizar* abaixo), com um `CODIGO_ACESSO` só seu.
2. Abra o app. A tela **Primeiro acesso** pede o código de acesso e cria o **administrador**.
3. No menu **Usuários**, o administrador cria as outras pessoas ou aprova quem pediu cadastro pela tela de login.

Enquanto o script antigo estiver publicado, ou enquanto nenhum usuário existir, tudo funciona como antes.

| Perfil | Pode |
|---|---|
| Administrador | Tudo, incluindo usuários |
| Operador | Criar e alterar minutas, histórico, frete cortesia, cadastros, conferir e enviar e-mails |
| Consulta | Só o histórico |
| Personalizado | O administrador marca item por item |

Permissões: *Histórico*, *Frete cortesia*, *Configurações* (acessar) e *Criar minutas*, *Alterar minutas*, *Excluir minutas*, *Alterar cadastros*, *Conferir e enviar e-mails* (alterar). *Gerenciar usuários* é só do Administrador.

- **Cadastro pela tela de login:** em *Não tem usuário? Crie seu cadastro* a pessoa informa nome, usuário e senha e já entra com o perfil **Consulta** (só o histórico). Só o administrador muda o perfil dela, em *Usuários*. Para desligar o cadastro, mude `PERMITIR_CADASTRO` para `false` no script.
- Só o perfil **Administrador** gerencia usuários.
- **Vínculo com o Google Sheets:** a URL do script (e, no Windows, as demais opções do Google) fica no fim da tela *Usuários*, visível só para quem gerencia usuários. Num aparelho ainda sem vínculo o app abre sem login, só para o vínculo ser feito ali.
- Quem confere a sessão e a permissão é o script do Google, em cada pedido. A tela só esconde o que não está liberado.
- Os usuários ficam na aba **Usuarios** da planilha. A senha é guardada protegida (hash com sal); não edite as colunas *Senha (protegida)* e *Sessão*.
- A coluna **Usuário** da aba *Minutas* mostra quem gravou cada minuta por último.
- Sessão: 12 horas, ou 30 dias com **Manter conectado**. Cinco senhas erradas seguidas bloqueiam o login por 5 minutos.
- Desativar um usuário ou redefinir a senha dele encerra as sessões abertas na hora.
- **Esqueci a senha do administrador:** na planilha, apague as linhas da aba *Usuarios* (deixe a linha 1) e refaça o primeiro acesso.
- No programa do Windows, o login vale quando o Google Sheets está configurado. Sem URL do Google (só planilha local), ele abre sem login.

## Pedidos de envio
Quem tem a permissão **Pedir envios** (o perfil Consulta tem) abre **Envio** (Alt+4), informa de quem para quem vai o envio, quantidade, conteúdo e observação, e envia.

- Quem cria minutas é avisado: contador em **Envio** no menu, faixa amarela na **Nova minuta** e aviso na tela (e notificação do sistema, se ativar "Avisar com o app minimizado"). O app confere a cada minuto.
- Em **Ver e incluir**, marque os pedidos e clique em **Incluir no malote**: eles viram itens da minuta aberta (marcados como *pedido*).
- Ao **gerar o PDF** ou **registrar**, o pedido fica **incluído** com o número da minuta, e quem pediu é avisado. Excluir a minuta devolve o pedido para *aguardando*.
- **Para quem vai** só aceita quem está no **cadastro de destinatários** (tela Destinatários): a lista aparece ao digitar e um nome fora do cadastro mostra o aviso *Destinatário não cadastrado* e bloqueia o envio (o script do Google também recusa). Quem tem *Alterar cadastros* pode cadastrar a pessoa ali mesmo (v3.4).
- Quem pediu pode cancelar enquanto o pedido aguarda; quem monta o malote pode recusar, com um motivo que a pessoa vê.
- Pedidos **recusados** ou **cancelados** podem ser excluídos por quem tem a permissão **Excluir pedidos** (o Administrador tem; para outros, marque no perfil Personalizado).
- Os pedidos ficam na aba **Pedidos** da planilha.

## Avisos por e-mail (v2.8)
Quando um pedido de envio é **incluído** numa minuta (ao gerar o PDF ou registrar) ou **recusado**, é gerado um e-mail corporativo com os detalhes, o motivo (se recusado) e a assinatura da Expedição. Ele sai automático para quem fez o pedido; cópias para outras pessoas são conferidas antes (veja *E-mails automáticos, conferidos e destinatários*).

- O e-mail vai para o endereço do cadastro da pessoa: o administrador preenche em **Usuários**, ou a própria pessoa em **Minha conta › E-mail para avisos**. Outras pessoas recebem cópia só pelo cadastro de destinatários, depois de conferido.
- **Editar o e-mail:** em **Usuários › Aviso por e-mail › Editar modelo** (só o Administrador). Dá para mudar assunto, saudação, textos de abertura e fechamento, selo, a linha "Incluído por…", o que aparece no quadro (minuta, de, para, quantidade, observação, data, motivo), o botão, a despedida, a assinatura (uma informação por linha) e o rodapé, para *pedido incluído* e *pedido recusado*, com prévia ao vivo. **Campo vazio = não aparece no e-mail.** Variáveis como `{primeiro_nome}`, `{minuta}`, `{atendente}` e `{motivo}` são trocadas pelos dados do pedido; `**texto**` vira negrito. Também dá para desligar os avisos, enviar um teste para você e **Restaurar padrão**.
- O modelo fica guardado no script do Google (Propriedades do script) e vale para todos os aparelhos. Os valores `EMAIL_*` no início do `GoogleSheets_Script.gs` são só o padrão.
- Sai da conta Google dona do script. Por padrão, a resposta vai para quem atendeu o pedido, se essa pessoa tiver e-mail (ou para o endereço de "Responder para" do modelo).
- Regravar a mesma minuta não manda o aviso de novo. Cancelamento feito pela própria pessoa não gera e-mail.
- **Ativar (uma vez):** cole o script novo, mantenha o seu `CODIGO_ACESSO`, salve, escolha a função **testarEmail** e clique em **Executar**. Autorize o envio de e-mail; chegam dois exemplos na sua caixa. Depois **Implantar › Gerenciar implantações › ✏️ › Nova versão**.
- Limite do Google: 100 e-mails por dia em contas Gmail comuns, 1.500 no Google Workspace.

## E-mails automáticos, conferidos e destinatários (v3.2)
**Quem fez o pedido recebe automático** (como antes) os avisos de pedido **incluído** na minuta (ao gerar o PDF ou registrar), **recusado**, **reaberto**, **comentário** de quem monta o malote e **lembrete** de pedido parado (só os pedidos dele). O e-mail é o do cadastro em **Usuários**/**Minha conta**; se não tiver, vale o do destinatário ligado ao usuário dele. Tudo fica registrado na aba **Emails** como *Automático*.

**Ao gerar o PDF ou registrar a minuta** com pedidos, a janela de conferência abre sempre, já com **quem vai receber o envio** (o "Para" do pedido, ex.: Kaue) marcado, se estiver no cadastro de destinatários (v3.3).

**Qualquer outra pessoa** (gestor, outro setor, quem monta o malote quando quem pediu comenta) **só recebe depois de conferido**:

- Logo depois da ação abre a janela **Conferir e-mail antes de enviar**: prévia da mensagem e a lista **Para quem vai**, com caixas de marcar do cadastro de destinatários. Não há campo para digitar endereço. Quando quem pediu já recebeu, a janela avisa "Já enviado automaticamente para…".
- **Sempre em cópia:** marque no destinatário (gestor ou quem precisa acompanhar). Ele já vem marcado em todo aviso para conferir, sem precisar entrar como pedido de envio. Se ninguém estiver "Sempre em cópia", os avisos automáticos não abrem a janela.
- **Enviar** manda para os marcados (cada um com o próprio nome na saudação). **Agora não** deixa o e-mail como **pendência no sino de notificações**, com **Conferir e enviar** e **Excluir**. **Descartar** não envia para ninguém.
- Se quem pediu não tem e-mail, o aviso não sai automático: vira pendência, com o botão **Cadastrar** para incluir a pessoa no cadastro.
- **Tela Destinatários** (menu, ao lado de Envio): **E-mails para conferir** (pendentes, enviados, automáticos e descartados recentes) e o **Cadastro de destinatários**: nome, e-mail, setor, usuário do Gerador (opcional), ativo e *Sempre em cópia*. **Importar usuários** traz quem já tem e-mail em Usuários.
- Permissões: *Alterar cadastros* gerencia o cadastro. *Conferir e enviar e-mails* (Administrador e Operador têm) vê e envia as pendências de todos. Sem ela, a pessoa confere só as das próprias ações.
- Abas **Destinatarios** e **Emails** na planilha. Precisa do script do Google **3.4**.

## Reabrir pedido e notificações (v3.0)
- **Reabrir:** pedido **recusado** (ou cancelado) ganha o botão **Reabrir** em "Atendidos recentemente". Ele volta para a fila de aguardando, para entrar num malote posterior, com uma observação opcional. A reabertura fica registrada na conversa do pedido e quem pediu recebe o e-mail **Reaberto** (editável no modelo). Quem monta o malote reabre qualquer pedido; quem pediu reabre só os que ele mesmo cancelou.
- **Sino de notificações:** no topo de todas as telas, ao lado dos botões do cabeçalho. Mostra os comentários (e reaberturas) dos seus pedidos ou dos pedidos que você atende, com o número de não lidos. Clique num item para abrir a conversa; **Marcar todas como lidas** zera o contador. Os avisos de pedidos para incluir no malote continuam como antes.
- Precisa do script do Google **3.0**.

## Comentários, lembrete e auditoria (v2.9)
- **Comentários nos pedidos:** na tela **Envio**, cada pedido tem o botão **Comentar** (ou o número de comentários). Abre uma conversa entre quem pediu e quem monta o malote. O ponto vermelho marca comentário que você ainda não leu, e chega um aviso no app quando alguém comenta. Por e-mail: quando quem pediu comenta, avisa quem monta o malote; quando quem monta comenta, avisa quem pediu. Os comentários ficam na aba **Comentarios** da planilha.
- **Lembrete de pedido parado:** pedido aguardando há mais de N horas (padrão 24) gera um e-mail para quem monta o malote e se repete a cada N horas enquanto continuar parado. Liga, desliga, muda as horas e o texto em **Usuários › Aviso por e-mail › Editar modelo › Lembrete**. A verificação roda enquanto o app está em uso (no máximo a cada 30 min). Para testar na hora: função `testarLembrete` no editor do Apps Script.
- **Histórico de ações (auditoria):** em **Usuários › Histórico de ações** (só Administrador), com busca, filtro por tipo e **Baixar CSV**. Registra entradas no sistema (e logins recusados), minutas registradas, alteradas e excluídas, pedidos criados, cancelados, recusados e excluídos, comentários, usuários criados, alterados e excluídos, troca de senha e de e-mail, mudanças no modelo de e-mail e os lembretes enviados. Fica na aba **Auditoria** da planilha (últimas 20 mil linhas).
- Precisa do script do Google **2.9**.

## Atalhos de teclado (v2.8)
Os atalhos não usam teclas que o navegador já usa. Lista completa no app em **Atalhos** (Alt+A).

| Ação | Tecla | | Ação | Tecla |
|---|---|---|---|---|
| Nova minuta / Histórico / Configurações / Envio | Alt+1 / 2 / 3 / 4 | | Adicionar item | F2 |
| Nova minuta (limpar) | Alt+N | | Adicionar volume | Alt+V |
| Gerar PDF | Ctrl+S | | Editar remetente | F4 |
| Registrar na planilha | Ctrl+Shift+S | | Editar destinatário | F9 |
| Imprimir | Ctrl+P | | Buscar no histórico | Alt+B |
| Visualizar | Alt+P | | Focar busca / número | Alt+L |

No programa do Windows as teclas antigas (F1, F3, F5, F6, F7, Ctrl+N, Ctrl+F, Ctrl+L, Ctrl+D) continuam funcionando.

## Publicar no GitHub Pages (uma vez só)
**Settings → Pages** → *Build and deployment*: Source = **Deploy from a branch**, Branch = **main** / **(root)** → **Save**.
Em 1–2 minutos o endereço aparece na mesma página.

## Planilha do Google (Apps Script)
O arquivo **`GoogleSheets_Script.gs`** é o "servidor" da planilha.
- **Instalar** (planilha nova): Extensões › Apps Script › cole o arquivo › troque `CODIGO_ACESSO` › Salvar ›
  **Implantar › Nova implantação › App da Web** (Executar como: *Eu*; Quem pode acessar: *Qualquer pessoa*) ›
  copie a URL (termina em `/exec`) para o `config.js` (`scriptUrl`).
- **Atualizar** (versão nova do script): Apps Script › apague tudo › cole o novo › **coloque de novo o seu código** ›
  Salvar › **Implantar › Gerenciar implantações › ✏️ › Versão: Nova versão › Implantar**. A URL continua a mesma.
- Abas criadas pelo script: **Minutas** (uma linha por minuta; a coluna *Dados* guarda remetente/destinatário
  completos) e **Itens** (uma linha por item). Pode olhar e filtrar; não apague colunas nem a linha 1.
- O script valida a sequência dentro de um bloqueio: dois aparelhos nunca gravam o mesmo número.

## Programa do Windows
Os arquivos da raiz são também o app do Electron (`main.cjs`, `preload.cjs`, `package.json`).
Para atualizar um Gerador instalado: copie os arquivos deste repositório para `GeradorMinuta\resources\app\`
(substituindo) e abra o `GeradorMinuta.exe`. A pasta `desktop/` tem o LEIA-ME e o atalho de diagnóstico.
Em **Configurações › Google Sheets**, escolha **Base de dados: Google Sheets**.

## Arquivos
- `index.html`, `style.css`, `app.js`, `ui.js` — telas e regras (iguais no web e no Windows)
- `auth.js`, `auth.css` — tela de login, usuário logado, tela de usuários e bloqueio por permissão
- `destinatarios.js` — cadastro de destinatários e conferência dos e-mails antes do envio
- `print.js`, `frete-cortesia.js` — modelos de impressão da minuta e do frete cortesia
- `web-api.js`, `config.js` — ligação direta com o Google quando roda no navegador
- `sw.js`, `manifest.webmanifest`, `icon-*.png` — app instalável (PWA)
- `main.cjs`, `preload.cjs` — programa do Windows (Electron)
- `GoogleSheets_Script.gs` — script da planilha

## Atualizar
Envie os arquivos alterados para o `main`. O app no celular pega a versão nova ao abrir com internet
(se não pegar, feche e abra de novo).
