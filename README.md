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
| Operador | Criar e alterar minutas, histórico, frete cortesia, cadastros |
| Consulta | Só o histórico |
| Personalizado | O administrador marca item por item |

Permissões: *Histórico*, *Frete cortesia*, *Configurações* (acessar) e *Criar minutas*, *Alterar minutas*, *Excluir minutas*, *Alterar cadastros* (alterar). *Gerenciar usuários* é só do Administrador.

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
Quem tem a permissão **Pedir envios** (o perfil Consulta tem) abre **Pedidos**, informa de quem para quem vai o envio, quantidade, conteúdo e observação, e envia.

- Quem cria minutas é avisado: contador em **Pedidos** no menu, faixa amarela na **Nova minuta** e aviso na tela (e notificação do sistema, se ativar "Avisar com o app minimizado"). O app confere a cada minuto.
- Em **Ver e incluir**, marque os pedidos e clique em **Incluir no malote**: eles viram itens da minuta aberta (marcados como *pedido*).
- Ao **gerar o PDF** ou **registrar**, o pedido fica **incluído** com o número da minuta, e quem pediu é avisado. Excluir a minuta devolve o pedido para *aguardando*.
- Quem pediu pode cancelar enquanto o pedido aguarda; quem monta o malote pode recusar, com um motivo que a pessoa vê.
- Os pedidos ficam na aba **Pedidos** da planilha.

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
- `print.js`, `frete-cortesia.js` — modelos de impressão da minuta e do frete cortesia
- `web-api.js`, `config.js` — ligação direta com o Google quando roda no navegador
- `sw.js`, `manifest.webmanifest`, `icon-*.png` — app instalável (PWA)
- `main.cjs`, `preload.cjs` — programa do Windows (Electron)
- `GoogleSheets_Script.gs` — script da planilha

## Atualizar
Envie os arquivos alterados para o `main`. O app no celular pega a versão nova ao abrir com internet
(se não pegar, feche e abra de novo).
