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
2. Na primeira vez o app abre em **Configurações › Google Sheets**: digite o **código de acesso**
   (o mesmo do `CODIGO_ACESSO` do script), toque em **Testar conexão** e em **Salvar**.
   O código fica guardado só neste aparelho; ele nunca vai para o GitHub.
3. Vire app: iPhone → Compartilhar → **Adicionar à Tela de Início**; Android → ⋮ → **Instalar app**.

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
- `print.js`, `frete-cortesia.js` — modelos de impressão da minuta e do frete cortesia
- `web-api.js`, `config.js` — ligação direta com o Google quando roda no navegador
- `sw.js`, `manifest.webmanifest`, `icon-*.png` — app instalável (PWA)
- `main.cjs`, `preload.cjs` — programa do Windows (Electron)
- `GoogleSheets_Script.gs` — script da planilha

## Atualizar
Envie os arquivos alterados para o `main`. O app no celular pega a versão nova ao abrir com internet
(se não pegar, feche e abra de novo).
