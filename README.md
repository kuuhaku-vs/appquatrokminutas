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
- Quem pediu pode cancelar enquanto o pedido aguarda; quem monta o malote pode recusar, com um motivo que a pessoa vê.
- Pedidos **recusados** ou **cancelados** podem ser excluídos por quem tem a permissão **Excluir pedidos** (o Administrador tem; para outros, marque no perfil Personalizado).
- Os pedidos ficam na aba **Pedidos** da planilha.

## Avisos por e-mail (v2.8)
Quando um pedido de envio é **incluído** numa minuta (ao gerar o PDF ou registrar) ou **recusado**, é gerado um e-mail corporativo com os detalhes, o motivo (se recusado) e a assinatura da Expedição. Desde a v3.1 ele é **conferido antes de sair** e vai só para os destinatários marcados (veja *Destinatários e e-mails conferidos*).

- O e-mail vai para quem for marcado no **cadastro de destinatários**. O e-mail do usuário (em **Usuários** ou **Minha conta**) serve para importar a pessoa para o cadastro e para ela vir sugerida.
- **Editar o e-mail:** em **Usuários › Aviso por e-mail › Editar modelo** (só o Administrador). Dá para mudar assunto, saudação, textos de abertura e fechamento, selo, a linha "Incluído por…", o que aparece no quadro (minuta, de, para, quantidade, observação, data, motivo), o botão, a despedida, a assinatura (uma informação por linha) e o rodapé, para *pedido incluído* e *pedido recusado*, com prévia ao vivo. **Campo vazio = não aparece no e-mail.** Variáveis como `{primeiro_nome}`, `{minuta}`, `{atendente}` e `{motivo}` são trocadas pelos dados do pedido; `**texto**` vira negrito. Também dá para desligar os avisos, enviar um teste para você e **Restaurar padrão**.
- O modelo fica guardado no script do Google (Propriedades do script) e vale para todos os aparelhos. Os valores `EMAIL_*` no início do `GoogleSheets_Script.gs` são só o padrão.
- Sai da conta Google dona do script. Por padrão, a resposta vai para quem atendeu o pedido, se essa pessoa tiver e-mail (ou para o endereço de "Responder para" do modelo).
- Regravar a mesma minuta não manda o aviso de novo. Cancelamento feito pela própria pessoa não gera e-mail.
- **Ativar (uma vez):** cole o script novo, mantenha o seu `CODIGO_ACESSO`, salve, escolha a função **testarEmail** e clique em **Executar**. Autorize o envio de e-mail; chegam dois exemplos na sua caixa. Depois **Implantar › Gerenciar implantações › ✏️ › Nova versão**.
- Limite do Google: 100 e-mails por dia em contas Gmail comuns, 1.500 no Google Workspace.

## Destinatários e e-mails conferidos (v3.1)
Nenhum e-mail sai mais sozinho. Cada aviso (pedido incluído, recusado, reaberto, comentário e o lembrete de pedido parado) fica **pendente** até alguém conferir e clicar em **Enviar**.

- **Conferir e-mail:** logo depois da ação (gerar o PDF/registrar com pedidos, recusar, reabrir, comentar) abre a janela **Conferir e-mail antes de enviar**. À direita, a prévia da mensagem de verdade (assunto e corpo); à esquerda, **Para quem vai**: a lista do cadastro de destinatários com caixas de marcar. Não há campo para digitar endereço: só dá para marcar quem está cadastrado. Quem normalmente receberia o aviso (quem fez o pedido, quem monta o malote) já vem marcado como **Sugerido**, se estiver no cadastro; se não estiver, aparece um aviso com o botão **Cadastrar**.
- **Enviar** manda para os marcados (cada um recebe com o próprio nome na saudação). **Agora não** fecha e deixa o e-mail pendente. **Descartar** não envia para ninguém.
- **Tela Destinatários** (menu, ao lado de Envio): **E-mails para conferir** (pendentes, com *Conferir e enviar* e *Descartar*, e os enviados/descartados recentes) e o **Cadastro de destinatários**: nome, e-mail, setor, usuário do Gerador (opcional) e ativo. O nome sugere as pessoas do cadastro de *Pessoas e setores*. **Importar usuários** traz quem já tem e-mail em Usuários. Destinatário inativo fica no cadastro, mas não aparece para marcar.
- Com o **usuário do Gerador** preenchido no destinatário, ele vem marcado nos avisos dos pedidos dele.
- Permissões: *Alterar cadastros* gerencia o cadastro de destinatários. *Conferir e enviar e-mails* (nova; Administrador e Operador têm) vê e envia os pendentes de todos, inclusive o lembrete. Sem ela, a pessoa confere só os e-mails das próprias ações (por exemplo, um comentário dela); se fechar com *Agora não*, o e-mail fica para a Expedição conferir.
- Ficam na planilha nas abas **Destinatarios** e **Emails** (fila, com quem enviou, quando e para quem). As ações aparecem no Histórico de ações.
- Precisa do script do Google **3.1** (cole o `GoogleSheets_Script.gs` novo e publique a Nova versão). No programa do Windows, copie também os arquivos novos (`destinatarios.js`, `main.cjs`).

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
