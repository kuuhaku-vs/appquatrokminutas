/**
 * ============================================================
 *  GERADOR DE MINUTAS · QUATRO K  →  GOOGLE SHEETS
 * ============================================================
 *  Este script recebe as minutas enviadas pelo Gerador de Minutas
 *  e grava nesta planilha:
 *    • aba "Minutas" → uma linha por minuta (com link do PDF)
 *    • aba "Itens"   → uma linha por item de cada minuta
 *  Os PDFs ficam numa pasta do Drive ao lado desta planilha.
 *
 *  COMO INSTALAR (uma vez só):
 *   1. Crie uma planilha no Google Sheets (ex.: "Minutas Quatro K").
 *   2. Menu Extensões › Apps Script. Apague o que estiver lá e cole
 *      todo este arquivo.
 *   3. Troque o CODIGO_ACESSO abaixo por um código só seu.
 *   4. Clique em Salvar (ícone de disquete).
 *   5. Clique em Implantar › Nova implantação › engrenagem › "App da Web".
 *        - Executar como: Eu
 *        - Quem pode acessar: Qualquer pessoa
 *      Clique em Implantar e autorize o acesso com a sua conta Google.
 *   6. Copie a "URL do app da Web" (termina em /exec).
 *   7. No Gerador: Configurações › Google Sheets › cole a URL e o mesmo
 *      código de acesso › Testar conexão › Salvar.
 *
 *  ATUALIZANDO (já tinha a versão anterior instalada):
 *   1. Extensões › Apps Script › apague tudo e cole este arquivo.
 *   2. Mantenha o MESMO CODIGO_ACESSO que você já usava. Salve.
 *   3. Implantar › Gerenciar implantações › lápis (editar) ›
 *      Versão: "Nova versão" › Implantar. A URL continua a mesma.
 *
 *  A partir da versão 2.3 esta planilha também pode ser a BASE DE DADOS
 *  do Gerador (numeração, histórico e exclusões), no lugar do
 *  registro_itens.csv. Ative em Configurações › Google Sheets.
 * ============================================================
 */

const CODIGO_ACESSO = 'TROQUE-ESTE-CODIGO';      // o mesmo código informado no Gerador
const NOME_PASTA_PDF = 'Minutas Quatro K - PDFs'; // criada ao lado desta planilha
const ABA_MINUTAS = 'Minutas';
const ABA_ITENS = 'Itens';
const VERSAO_SCRIPT = '2.3';
const CAB_MINUTAS = ['Minuta', 'Data', 'Volumes', 'Embalagem', 'Remetente', 'Destinatário', 'Qtd. itens', 'Pessoas', 'PDF', 'Atualizado em', 'Origem', 'Dados'];
const CAB_ITENS = ['Minuta', 'Data', 'Item', 'Rem. / Setor', 'Dest. / Setor', 'Qtd.', 'Conteúdo', 'Obs.'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (CODIGO_ACESSO && req.token !== CODIGO_ACESSO) return resposta({ ok: false, error: 'Código de acesso inválido.' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const abaM = obterAba(ss, ABA_MINUTAS, CAB_MINUTAS);
    const abaI = obterAba(ss, ABA_ITENS, CAB_ITENS);

    if (req.acao === 'teste') return resposta({ ok: true, versao: VERSAO_SCRIPT, planilha: ss.getName(), url: ss.getUrl() });

    if (req.acao === 'proximo') {
      const max = maiorNumero(abaM);
      return resposta({ ok: true, versao: VERSAO_SCRIPT, max: max, numero: preencher(max + 1, req.digitos), url: ss.getUrl() });
    }

    if (req.acao === 'listar') {
      return resposta({ ok: true, versao: VERSAO_SCRIPT, url: ss.getUrl(), minutas: listarMinutas(ss, abaM, abaI) });
    }

    const m = req.minuta || {};
    const num = normalizarNumero(m.numero);
    if (!num) return resposta({ ok: false, error: 'Número de minuta inválido.' });

    if (req.acao === 'excluir') {
      const r = removerLinhas(abaM, num, true);
      removerLinhas(abaI, num, false);
      return resposta({ ok: true, removidas: r.qtd });
    }

    if (req.acao === 'registrar') {
      // Quando esta planilha é a base de dados, valida a sequência dentro do
      // bloqueio, para dois computadores nunca gravarem o mesmo número.
      if (req.validarSequencia && !req.revisao) {
        const max = maiorNumero(abaM);
        const proximo = preencher(max + 1, req.digitos);
        if (existeNumero(abaM, num)) return resposta({ ok: false, codigo: 'existe', proximo: proximo, error: 'A minuta nº ' + m.numero + ' já existe na planilha. Próximo número disponível: ' + proximo + '.' });
        if (Number(num) !== max + 1) return resposta({ ok: false, codigo: 'sequencia', proximo: proximo, error: 'A numeração foi alterada na planilha. Próximo número disponível: ' + proximo + '.' });
      }
      const anterior = removerLinhas(abaM, num, true);
      removerLinhas(abaI, num, false);

      let linkPdf = anterior.pdf || '';
      if (req.pdf && req.pdf.base64) linkPdf = salvarPdf(ss, req.pdf.nome || ('Minuta_' + m.numero + '.pdf'), req.pdf.base64);

      const itens = Array.isArray(m.itens) ? m.itens : [];
      const pessoas = Array.from(new Set(itens.map(function (i) { return i.pessoa; }).filter(String))).join(', ');
      const numeroTexto = String(m.numero);

      const linhaM = abaM.getLastRow() + 1;
      abaM.getRange(linhaM, 1, 1, CAB_MINUTAS.length).setValues([[
        numeroTexto, m.data || '', m.volumes || '', m.embalagem || '', m.remetente || '', m.destinatario || '',
        itens.length, pessoas, linkPdf, agoraTexto(ss), m.origem || '', m.dados ? JSON.stringify(m.dados) : ''
      ]]);

      if (itens.length) {
        const linhaI = abaI.getLastRow() + 1;
        abaI.getRange(linhaI, 1, itens.length, CAB_ITENS.length).setValues(itens.map(function (it, i) {
          return [numeroTexto, m.data || '', i + 1, it.pessoa || '', it.ref || '', Number(it.qtd) || 1, it.conteudo || '', it.obs || ''];
        }));
      }
      ordenar(abaM, CAB_MINUTAS.length);
      ordenar(abaI, CAB_ITENS.length);
      return resposta({ ok: true, pdf: linkPdf, url: ss.getUrl() });
    }

    return resposta({ ok: false, error: 'Ação desconhecida: ' + req.acao });
  } catch (err) {
    return resposta({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return resposta({ ok: true, versao: VERSAO_SCRIPT, servico: 'Gerador de Minutas · Quatro K', planilha: SpreadsheetApp.getActiveSpreadsheet().getName() });
}

// ---------- Auxiliares ----------
function resposta(obj) {
  obj.versao = VERSAO_SCRIPT;
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normalizarNumero(v) {
  const s = String(v == null ? '' : v).replace(/\D/g, '');
  return s ? String(parseInt(s, 10)) : '';
}

function obterAba(ss, nome, cabecalho) {
  let aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho])
      .setFontWeight('bold').setBackground('#0f1a33').setFontColor('#ffffff');
    aba.setFrozenRows(1);
    const padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
    if (padrao && padrao.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(padrao);
  }
  // Planilhas criadas pela versão anterior ganham as colunas novas no cabeçalho.
  const atual = aba.getRange(1, 1, 1, cabecalho.length).getValues()[0];
  if (atual.join('|') !== cabecalho.join('|')) {
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho])
      .setFontWeight('bold').setBackground('#0f1a33').setFontColor('#ffffff');
  }
  // Número e data como texto: mantém zeros à esquerda (000123) e evita
  // conversão automática de datas.
  aba.getRange('A:B').setNumberFormat('@');
  return aba;
}

function removerLinhas(aba, num, guardarPdf) {
  const ultima = aba.getLastRow();
  const res = { qtd: 0, pdf: '' };
  if (ultima < 2) return res;
  const valores = aba.getRange(2, 1, ultima - 1, Math.max(9, aba.getLastColumn())).getValues();
  for (let i = valores.length - 1; i >= 0; i--) {
    if (normalizarNumero(valores[i][0]) === num) {
      if (guardarPdf && valores[i][8] && !res.pdf) res.pdf = valores[i][8];
      aba.deleteRow(i + 2);
      res.qtd++;
    }
  }
  return res;
}

function ordenar(aba, colunas) {
  const ultima = aba.getLastRow();
  if (ultima > 2) aba.getRange(2, 1, ultima - 1, colunas).sort([{ column: 1, ascending: false }]);
}

function obterPastaPdf(ss) {
  const arquivo = DriveApp.getFileById(ss.getId());
  const pais = arquivo.getParents();
  const base = pais.hasNext() ? pais.next() : DriveApp.getRootFolder();
  const existentes = base.getFoldersByName(NOME_PASTA_PDF);
  return existentes.hasNext() ? existentes.next() : base.createFolder(NOME_PASTA_PDF);
}

function salvarPdf(ss, nome, base64) {
  const pasta = obterPastaPdf(ss);
  const iguais = pasta.getFilesByName(nome);
  while (iguais.hasNext()) iguais.next().setTrashed(true);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', nome);
  return pasta.createFile(blob).getUrl();
}

function preencher(n, digitos) {
  const d = Math.max(1, Number(digitos) || 6);
  let s = String(n);
  while (s.length < d) s = '0' + s;
  return s;
}

function maiorNumero(aba) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return 0;
  let max = 0;
  aba.getRange(2, 1, ultima - 1, 1).getValues().forEach(function (r) {
    const n = Number(normalizarNumero(r[0]));
    if (n > max) max = n;
  });
  return max;
}

function existeNumero(aba, num) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return false;
  return aba.getRange(2, 1, ultima - 1, 1).getValues().some(function (r) { return normalizarNumero(r[0]) === num; });
}

function textoCelula(v, ss, formato) {
  if (v instanceof Date) return Utilities.formatDate(v, ss.getSpreadsheetTimeZone(), formato || 'dd/MM/yyyy');
  return v == null ? '' : String(v);
}

function agoraTexto(ss) {
  return Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}

function listarMinutas(ss, abaM, abaI) {
  const itensPorNumero = {};
  const ultI = abaI.getLastRow();
  if (ultI >= 2) {
    abaI.getRange(2, 1, ultI - 1, CAB_ITENS.length).getValues().forEach(function (r) {
      const num = normalizarNumero(r[0]);
      if (!num) return;
      (itensPorNumero[num] = itensPorNumero[num] || []).push({
        item: Number(r[2]) || 0, pessoa: textoCelula(r[3], ss), ref: textoCelula(r[4], ss),
        qtd: Number(r[5]) || 1, conteudo: textoCelula(r[6], ss), obs: textoCelula(r[7], ss)
      });
    });
  }
  const ultM = abaM.getLastRow();
  if (ultM < 2) return [];
  return abaM.getRange(2, 1, ultM - 1, CAB_MINUTAS.length).getValues().map(function (r) {
    const num = normalizarNumero(r[0]);
    if (!num) return null;
    let dados = null;
    try { dados = r[11] ? JSON.parse(r[11]) : null; } catch (e) { dados = null; }
    const itens = (itensPorNumero[num] || []).sort(function (a, b) { return a.item - b.item; })
      .map(function (i) { return { pessoa: i.pessoa, ref: i.ref, qtd: i.qtd, conteudo: i.conteudo, obs: i.obs }; });
    return {
      numero: textoCelula(r[0], ss), data: textoCelula(r[1], ss), volumes: textoCelula(r[2], ss), embalagem: textoCelula(r[3], ss),
      remetente: textoCelula(r[4], ss), destinatario: textoCelula(r[5], ss), pdf: textoCelula(r[8], ss),
      atualizadoEm: textoCelula(r[9], ss, 'dd/MM/yyyy HH:mm:ss'), origem: textoCelula(r[10], ss), dados: dados, itens: itens
    };
  }).filter(function (x) { return x; });
}
