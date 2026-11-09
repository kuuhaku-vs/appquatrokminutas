const { app, BrowserWindow, ipcMain, shell, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Pasta de dados ao lado do .exe (portátil, sem precisar de administrador)
function resolveDataDir() {
  const exeDir = path.dirname(process.execPath);
  const candidate = app.isPackaged ? path.join(exeDir, 'dados') : path.join(__dirname, 'dados');
  try {
    fs.mkdirSync(candidate, { recursive: true });
    fs.accessSync(candidate, fs.constants.W_OK);
    return candidate;
  } catch {
    const fallback = path.join(app.getPath('documents'), 'Minutas Quatro K');
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}
let DATA;
const f = (n) => path.join(DATA, n);
const readJSON = (n, def) => { try { return JSON.parse(fs.readFileSync(f(n), 'utf8')); } catch { return def; } };
const writeJSON = (n, v) => fs.writeFileSync(f(n), JSON.stringify(v, null, 2), 'utf8');

let win;
// Persistência segura da posição/tamanho da janela. Estas funções estavam
// sendo chamadas pelo createWindow(), mas ausentes na V2.3, impedindo o app de abrir.
function getWindowStatePath() {
  const base = DATA || app.getPath('userData');
  try { fs.mkdirSync(base, { recursive: true }); } catch {}
  return path.join(base, 'window-state.json');
}
function readWindowState() {
  const fallback = { width: 1440, height: 940, maximized: true };
  try {
    const saved = JSON.parse(fs.readFileSync(getWindowStatePath(), 'utf8'));
    const area = screen.getPrimaryDisplay().workArea;
    const width = Math.min(Math.max(Number(saved.width) || fallback.width, 1100), area.width);
    const height = Math.min(Math.max(Number(saved.height) || fallback.height, 700), area.height);
    const state = { width, height, maximized: saved.maximized !== false };
    if (Number.isInteger(saved.x)) state.x = saved.x;
    if (Number.isInteger(saved.y)) state.y = saved.y;
    return state;
  } catch { return fallback; }
}
function saveWindowState() {
  try {
    if (!win || win.isDestroyed()) return;
    const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
    const state = { ...bounds, maximized: win.isMaximized() };
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    try { fs.appendFileSync(path.join(DATA || app.getPath('userData'), 'inicializacao.log'), `[${new Date().toISOString()}] saveWindowState: ${err.stack || err}\n`, 'utf8'); } catch {}
  }
}

function createWindow() {
  const startupStartedAt = Date.now();
  const MIN_STARTUP_SPLASH_MS = 1800;
  const state = readWindowState();
  const options = {
    show: false,
    width: state.width || 1440, height: state.height || 940,
    minWidth: 900, minHeight: 600,
    backgroundColor: '#0b1020', title: 'Gerador de Minutas · Quatro K',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  };
  if (Number.isInteger(state.x) && Number.isInteger(state.y)) { options.x = state.x; options.y = state.y; }
  win = new BrowserWindow(options);
  win.loadFile(path.join(__dirname, 'index.html'));

  // Mantém a janela oculta enquanto o HTML e a tela de carregamento são preparados.
  // A janela só aparece depois de pronta e após a duração mínima da splash.
  // Primeira execução maximizada; as próximas respeitam o estado salvo.
  win.once('ready-to-show', () => {
    const remaining = Math.max(0, MIN_STARTUP_SPLASH_MS - (Date.now() - startupStartedAt));
    setTimeout(() => {
      if (!win || win.isDestroyed()) return;
      // Sempre abre ocupando a área útil do monitor em que a janela está.
      win.maximize();
      win.show();
      win.focus();
      ajustarZoom();
    }, remaining);
  });

  // Ajuste automático ao monitor: a interface foi desenhada para ~1500×860.
  // Em telas menores ela é reduzida proporcionalmente (sem barra de rolagem);
  // em telas grandes, levemente ampliada.
  let zoomTimer = null;
  function ajustarZoom() {
    if (!win || win.isDestroyed()) return;
    const [w, h] = win.getContentSize();
    const z = Math.max(0.7, Math.min(1.15, Math.min(w / 1500, h / 860)));
    win.webContents.setZoomFactor(Math.round(z * 100) / 100);
  }
  win.webContents.on('did-finish-load', ajustarZoom);
  win.on('resize', () => { clearTimeout(zoomTimer); zoomTimer = setTimeout(ajustarZoom, 120); });
  screen.on('display-metrics-changed', ajustarZoom);

  const persist = () => saveWindowState();
  win.on('resize', persist);
  win.on('move', persist);
  win.on('maximize', persist);
  win.on('unmaximize', persist);
  win.on('close', persist);
}

app.whenReady().then(async () => {
  try {
    DATA = resolveDataDir();
    fs.mkdirSync(f('minutas'), { recursive: true });
    createWindow();
    setTimeout(() => { try { if (lerFilaSheets().length) processarFilaSheets(); } catch {} }, 8000);
  } catch (err) {
    const details = String(err && (err.stack || err.message) || err);
    try { fs.appendFileSync(path.join(DATA || app.getPath('userData'), 'inicializacao.log'), `[${new Date().toISOString()}] FALHA AO INICIAR
${details}
`, 'utf8'); } catch {}
    dialog.showErrorBox('Gerador de Minuta - erro ao iniciar', details);
  }
}).catch(err => {
  const details = String(err && (err.stack || err.message) || err);
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'inicializacao.log'), `[${new Date().toISOString()}] FALHA app.whenReady
${details}
`, 'utf8'); } catch {}
  dialog.showErrorBox('Gerador de Minuta - erro ao iniciar', details);
});
app.on('window-all-closed', () => app.quit());

ipcMain.handle('config:get', () => {
  const cfg = getConfigSeguro();
  writeJSON('config.json', cfg);
  return cfg;
});
ipcMain.handle('config:set', (_e, cfg) => {
  const next = { ...(cfg || {}) };
  if (!next.planilhaDir) next.planilhaDir = DEFAULT_PLANILHA_DIR;
  writeJSON('config.json', next);
  return true;
});
ipcMain.handle('config:escolherPlanilha', async () => {
  const current = getConfigSeguro();
  const result = await dialog.showOpenDialog(win, {
    title: 'Selecionar local da planilha de banco de dados',
    defaultPath: current.planilhaDir || DATA,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  const dir = result.filePaths[0];
  const next = { ...current, planilhaDir: dir };
  writeJSON('config.json', next);
  // Trocar o local também atualiza imediatamente o espelho local do histórico.
  // O próximo carregamento do Histórico sempre consulta novamente o CSV configurado.
  try { sincronizarHistoricoComPlanilha(); } catch (err) { console.error('Falha ao atualizar histórico após trocar a planilha:', err); }
  return { ok: true, path: path.join(dir, 'registro_itens.csv'), dir };
});
ipcMain.handle('numero:proximo', async (_e, digitos) => {
  if (bancoGoogle()) {
    try { const r = await sheetsPost({ acao: 'proximo', digitos: Math.max(1, Number(digitos) || 6) }, 20000); return { ok: true, numero: r.numero }; }
    catch (err) { return { ok: false, error: 'Não foi possível consultar a numeração no Google Sheets: ' + String(err?.message || err) }; }
  }
  try { return { ok: true, numero: proximoNumero(digitos) }; }
  catch (err) { return { ok: false, error: String(err?.message || err) }; }
});
ipcMain.handle('planilha:duplicatas', async () => {
  if (bancoGoogle()) {
    // No Google cada número ocupa uma única linha: não há duplicidade possível.
    try { const r = await sheetsPost({ acao: 'proximo', digitos: cfgDigitosFromLocalConfig() }, 20000); return { ok: true, exists: true, max: r.max, used: [], duplicates: [] }; }
    catch (err) { return { ok: false, error: 'Google Sheets indisponível: ' + String(err?.message || err) }; }
  }
  try { const info = analisarPlanilha(); return { ok: true, ...info }; }
  catch (err) { return { ok: false, error: String(err) }; }
});
ipcMain.handle('historico:get', async () => {
  if (bancoGoogle()) {
    try { const r = await sheetsPost({ acao: 'listar' }, 60000); return historicoDeSheets(r.minutas); }
    catch (err) { logBanco('Histórico do Google indisponível, usando cópia local: ' + (err?.message || err)); return readJSON('historico.json', []); }
  }
  try {
    return sincronizarHistoricoComPlanilha();
  } catch (err) {
    console.error('Falha ao sincronizar histórico com a planilha:', err);
    return [];
  }
});
ipcMain.handle('minuta:excluir', async (_e, numero) => {
  if (bancoGoogle()) {
    try {
      const target = normalizarNumeroMinuta(numero);
      if (target === null) throw new Error('Número de minuta inválido.');
      const r = await sheetsPost({ acao: 'excluir', minuta: { numero: String(numero) } }, 30000);
      if (!r.removidas) throw new Error(`A minuta nº ${numero} não foi encontrada no Google Sheets.`);
      writeJSON('historico.json', readJSON('historico.json', []).filter((x) => normalizarNumeroMinuta(x.numero) !== target));
      gravarFilaSheets(lerFilaSheets().filter((x) => x.numero !== target));
      if (sheetsCfg().copiaCsv) { try { excluirDoCSVSilencioso(target); } catch (e) { logBanco('Exclusão no CSV não aplicada: ' + (e?.message || e)); } }
      return { ok: true, numero: target, removidas: r.removidas };
    } catch (err) { return { ok: false, error: String(err?.message || err) }; }
  }
  try {
    const target = normalizarNumeroMinuta(numero);
    if (target === null) throw new Error('Número de minuta inválido.');
    const file = getPlanilhaPath();
    if (!fs.existsSync(file)) throw new Error('A planilha de banco de dados não foi encontrada no local configurado.');
    const dir = path.dirname(file);
    const lockPath = await acquireLock(dir, '.minuta-write.lock');
    try {
      const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      if (!lines.length) throw new Error('A planilha está vazia ou inválida.');
      const header = lines[0];
      const rows = lines.slice(1);
      const mantidas = [];
      let removidas = 0;
      for (const line of rows) {
        if (normalizarNumeroMinuta(extrairPrimeiroCampoCSV(line)) === target) removidas++;
        else mantidas.push(line);
      }
      if (!removidas) throw new Error(`A minuta nº ${numero} não foi encontrada na planilha.`);
      fs.writeFileSync(file, '\uFEFF' + [header, ...mantidas].join('\r\n') + '\r\n', 'utf8');
      const historico = readJSON('historico.json', []).filter((x) => normalizarNumeroMinuta(x.numero) !== target);
      writeJSON('historico.json', historico);
      enfileirarSheets('excluir', { numero: target });
      return { ok: true, numero: target, removidas, restantes: mantidas.length };
    } finally {
      releaseLock(lockPath);
    }
  } catch (err) {
    const msg = String(err?.message || err);
    return { ok: false, error: msg.includes('EBUSY') ? 'A planilha está aberta no Excel. Feche-a e tente novamente.' : msg };
  }
});
function excluirDoCSVSilencioso(target) {
  const file = getPlanilhaPath();
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return;
  const mantidas = lines.slice(1).filter((l) => normalizarNumeroMinuta(extrairPrimeiroCampoCSV(l)) !== target);
  fs.writeFileSync(file, '\uFEFF' + [lines[0], ...mantidas].join('\r\n') + '\r\n', 'utf8');
}
ipcMain.handle('dados:abrir', () => shell.openPath(DATA));
ipcMain.handle('dados:path', () => DATA);

function csvCell(v) { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

const DEFAULT_PLANILHA_DIR = 'U:\\Programação - ideias\\Minuta - Malote';

function getConfigSeguro() {
  const cfg = readJSON('config.json', {});
  if (!cfg.planilhaDir) cfg.planilhaDir = DEFAULT_PLANILHA_DIR;
  return cfg;
}

function getPlanilhaPath() {
  const cfg = getConfigSeguro();
  return path.join(cfg.planilhaDir, 'registro_itens.csv');
}

function normalizarNumeroMinuta(v) {
  const s = String(v ?? '').trim();
  if (!/^\d+$/.test(s)) return null;
  return String(parseInt(s, 10));
}

function extrairPrimeiroCampoCSV(line) {
  const s = String(line || '');
  if (!s) return '';
  if (s[0] !== '"') return s.split(';')[0].trim();
  let out = '', quoted = true;
  for (let i = 1; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      if (s[i + 1] === '"') { out += '"'; i++; }
      else { quoted = false; if (s[i + 1] === ';') break; }
    } else if (quoted) out += ch;
  }
  return out.trim();
}

function parseCSVLine(line) {
  const out = []; let cur = ''; let quoted = false;
  for (let i = 0; i < String(line || '').length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ';' && !quoted) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function normalizarTexto(v) {
  return String(v ?? '').trim();
}

function parseDataHistorico(v) {
  const s = normalizarTexto(v);
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [a, m, d] = s.split('-');
    return `${d}/${m}/${a}`;
  }
  return s;
}

function dataISOHistorico(v) {
  const s = normalizarTexto(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, a] = s.split('/');
    return `${a}-${m}-${d}`;
  }
  return '';
}

function sincronizarHistoricoComPlanilha() {
  const file = getPlanilhaPath();
  if (!fs.existsSync(file)) {
    // O histórico deve refletir o local atualmente configurado.
    // Se a nova planilha ainda não existe, não reaproveitamos o histórico antigo.
    writeJSON('historico.json', []);
    return [];
  }

  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    writeJSON('historico.json', []);
    return [];
  }

  const header = parseCSVLine(lines[0]).map(normalizarTexto);
  const idx = Object.fromEntries(header.map((h, i) => [h.toLowerCase(), i]));
  const get = (row, name, fallback = '') => {
    const i = idx[name.toLowerCase()];
    return i === undefined ? fallback : normalizarTexto(row[i]);
  };

  // Mantém dados complementares que só existem no histórico local (CNPJ, endereço,
  // detalhes de contato e caminho local do PDF), mas a existência da minuta passa
  // a ser determinada exclusivamente pela planilha configurada.
  const anterior = readJSON('historico.json', []);
  const anteriorMap = new Map(anterior.map((h) => [normalizarNumeroMinuta(h.numero), h]));
  const grupos = new Map();

  for (const line of lines.slice(1)) {
    const row = parseCSVLine(line);
    const numero = normalizarNumeroMinuta(get(row, 'Minuta', row[0]));
    if (numero === null) continue;

    if (!grupos.has(numero)) grupos.set(numero, []);
    grupos.get(numero).push(row);
  }

  const resultado = [...grupos.entries()].map(([numero, rows]) => {
    const primeiro = rows[0];
    const antigo = anteriorMap.get(numero) || {};
    const itens = rows
      .filter((row) => get(row, 'Rem. / Setor', row[9]) || get(row, 'Dest. / Setor', row[10]) || get(row, 'Conteudo', row[12]) || get(row, 'Obs', row[13]))
      .map((row, i) => ({
        pessoa: get(row, 'Rem. / Setor', row[9]),
        ref: get(row, 'Dest. / Setor', row[10]),
        qtd: Math.max(1, parseInt(get(row, 'Qtd', row[11]), 10) || 1),
        conteudo: ['Envelope', 'Pacote', 'Caixa', 'Outros'].includes(get(row, 'Conteudo', row[12])) ? get(row, 'Conteudo', row[12]) : 'Outros',
        obs: get(row, 'Obs', row[13]),
      }));

    const itensFinais = itens.length ? itens : (antigo.itens || []);
    const embalagens = [];
    const tipoEmbalagem = get(primeiro, 'Tipo Embalagem', primeiro[5]);
    const volumeTexto = get(primeiro, 'Quant. Vol.', primeiro[4]);
    const partes = tipoEmbalagem.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
    for (const parte of partes) {
      const m = parte.match(/^(\d+)\s+(.+)$/);
      if (m) embalagens.push({ quantidade: Math.max(1, parseInt(m[1], 10) || 1), tipo: m[2].toLowerCase().replace(/^(.)/, (x) => x.toUpperCase()).replace(/S$/i, '') });
    }
    if (!embalagens.length) {
      const qtd = Math.max(1, parseInt(String(volumeTexto).match(/\d+/)?.[0] || '1', 10));
      embalagens.push({ quantidade: qtd, tipo: tipoEmbalagem.replace(/^\d+\s*/i, '') || 'Malote' });
    }

    const remetenteNome = get(primeiro, 'Remetente', primeiro[6]);
    const destinatarioNome = get(primeiro, 'Destinatario', primeiro[7]);
    const remetente = { ...(antigo.remetente || {}), nome: remetenteNome || antigo.remetente?.nome || '' };
    const destinatario = { ...(antigo.destinatario || {}), nome: destinatarioNome || antigo.destinatario?.nome || '' };

    return {
      ...antigo,
      numero: String(numero).padStart(cfgDigitosFromLocalConfig(), '0'),
      data: parseDataHistorico(get(primeiro, 'Data', primeiro[1])),
      dataISO: dataISOHistorico(get(primeiro, 'Data', primeiro[1])) || antigo.dataISO || '',
      veiculo: get(primeiro, 'Veiculo', primeiro[3]),
      tipoEntrega: get(primeiro, 'Tipo Entrega', primeiro[2]),
      volumes: volumeTexto || antigo.volumes || String(embalagens.reduce((s, x) => s + x.quantidade, 0)),
      embalagem: tipoEmbalagem || antigo.embalagem || '',
      embalagens,
      remetente,
      destinatario,
      itens: itensFinais,
      pdf: get(primeiro, 'Arquivo PDF', primeiro[14]) || antigo.pdf || '',
      carimbo: get(primeiro, 'Gerado em', primeiro[15]) || antigo.carimbo || '',
      revisao: true,
    };
  });

  resultado.sort((a, b) => (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0));
  writeJSON('historico.json', resultado);
  return resultado;
}

function lerHistoricoCSVSemGravar() {
  const backup = readJSON('historico.json', []);
  const lido = sincronizarHistoricoComPlanilha();
  if (bancoGoogle()) writeJSON('historico.json', backup);
  return lido;
}

function cfgDigitosFromLocalConfig() {
  const localCfg = readJSON('config.json', {});
  return Math.max(1, Number(localCfg.digitos) || 6);
}

function analisarPlanilha() {
  const file = getPlanilhaPath();
  if (!fs.existsSync(file)) return { exists: false, max: 0, used: [], duplicates: [] };
  const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const counts = new Map();
  for (const line of lines.slice(1)) {
    const row = parseCSVLine(line);
    const n = normalizarNumeroMinuta(row[0]);
    if (n !== null) {
      const rec = counts.get(n) || { rows: 0, pdfs: new Set(), timestamps: new Set(), datas: new Set() };
      rec.rows++;
      if (row[14]) rec.pdfs.add(path.basename(row[14]));
      if (row[15]) rec.timestamps.add(row[15]);
      if (row[1]) rec.datas.add(row[1]);
      counts.set(n, rec);
    }
  }
  const used = [...counts.keys()].map(Number).filter(Number.isFinite);
  const duplicates = [...counts.entries()]
    .filter(([, rec]) => rec.pdfs.size > 1 || rec.timestamps.size > 1 || rec.datas.size > 1)
    .map(([numero, rec]) => ({ numero: Number(numero), ocorrencias: rec.rows, arquivos: [...rec.pdfs], datas: [...rec.datas] }));
  return { exists: true, max: used.length ? Math.max(...used) : 0, used, duplicates };
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function acquireLock(dir, name) {
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, name);
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      const fd = fs.openSync(lock, 'wx');
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, host: require('os').hostname(), at: new Date().toISOString() }), 'utf8');
      fs.closeSync(fd);
      return lock;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const age = Date.now() - fs.statSync(lock).mtimeMs;
        if (age > 120000) fs.unlinkSync(lock);
      } catch {}
      await sleep(120);
    }
  }
  throw new Error('Não foi possível obter o bloqueio compartilhado. Verifique se a pasta da planilha está acessível.');
}

function releaseLock(lock) { try { fs.unlinkSync(lock); } catch {} }

function proximoNumero(digitos = 6) {
  const file = getPlanilhaPath();
  if (!fs.existsSync(file)) {
    throw new Error('A planilha de banco de dados não foi encontrada no local configurado: ' + path.dirname(file));
  }
  const info = analisarPlanilha();
  // A planilha compartilhada é a única fonte da sequência.
  // O próximo número é sempre o maior número já registrado + 1.
  const next = (Number(info.max) || 0) + 1;
  return String(next).padStart(Math.max(1, Number(digitos) || 6), '0');
}

async function registrarCSV(m) {
  const file = getPlanilhaPath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) throw new Error('O local configurado para a planilha não está disponível: ' + dir);
  const lockPath = await acquireLock(dir, '.minuta-write.lock');
  try {
    const header = ['Minuta', 'Data', 'Tipo Entrega', 'Veiculo', 'Quant. Vol.', 'Tipo Embalagem', 'Remetente', 'Destinatario', 'Item', 'Rem. / Setor', 'Dest. / Setor', 'Qtd', 'Conteudo', 'Obs', 'Arquivo PDF', 'Gerado em'];
    const exists = fs.existsSync(file);
    let lines = exists ? fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean) : [header.join(';')];
    const target = normalizarNumeroMinuta(m.numero);
    if (target === null) throw new Error('O número da minuta deve conter somente números.');

    // Recalcula dentro do lock para impedir que dois computadores da pasta
    // compartilhada gravem o mesmo próximo número.
    const usados = [];
    for (const l of lines.slice(1)) {
      const n = normalizarNumeroMinuta(extrairPrimeiroCampoCSV(l));
      if (n !== null) usados.push(Number(n));
    }
    const proximoBanco = (usados.length ? Math.max(...usados) : 0) + 1;
    const existing = lines.slice(1).filter((l) => normalizarNumeroMinuta(extrairPrimeiroCampoCSV(l)) === target);

    if (!m.revisao && existing.length) {
      throw new Error(`A minuta nº ${m.numero} já existe na planilha. Próximo número disponível: ${String(proximoBanco).padStart(Math.max(1, Number(getConfigSeguro().digitos) || 6), '0')}.`);
    }
    if (!m.revisao && Number(target) !== proximoBanco) {
      throw new Error(`A numeração foi alterada na planilha. Próximo número disponível: ${String(proximoBanco).padStart(Math.max(1, Number(getConfigSeguro().digitos) || 6), '0')}.`);
    }

    lines = [lines[0], ...lines.slice(1).filter((l) => normalizarNumeroMinuta(extrairPrimeiroCampoCSV(l)) !== target)];
    const now = new Date().toLocaleString('pt-BR');
    const items = m.itens.length ? m.itens : [{}];
    items.forEach((it, i) => {
      lines.push([m.numero, m.data, m.tipoEntrega, m.veiculo, m.volumes, m.embalagem, m.remetente.nome, m.destinatario.nome,
        m.itens.length ? i + 1 : '', it.pessoa, it.ref, it.qtd, it.conteudo, it.obs, m.pdf || '', now].map(csvCell).join(';'));
    });
    fs.writeFileSync(file, '\uFEFF' + lines.join('\r\n') + '\r\n', 'utf8');
  } finally { try { fs.unlinkSync(lockPath); } catch {} }
}

function salvarHistorico(m) {
  const h = readJSON('historico.json', []).filter((x) => x.numero !== m.numero);
  h.unshift(m);
  writeJSON('historico.json', h);
}

async function renderPDF(html) {
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const pdf = await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'none' }, preferCSSPageSize: true });
  w.destroy();
  return pdf;
}

ipcMain.handle('minuta:pdf', async (_e, { minuta, html }) => {
  let tempPath = '';
  try {
    const dir = f('minutas');
    fs.mkdirSync(dir, { recursive: true });
    const nomeBase = `Minuta_${minuta.numero}_${String(minuta.data || '').replace(/\//g, '-')}.pdf`;
    let pdfPath = path.join(dir, nomeBase);

    // Evita EPERM no Windows se o arquivo de destino já existir ou estiver aberto.
    if (fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
      } catch {
        const ext = path.extname(nomeBase);
        const stem = path.basename(nomeBase, ext);
        let copia = 2;
        do {
          pdfPath = path.join(dir, `${stem}_${copia}${ext}`);
          copia += 1;
        } while (fs.existsSync(pdfPath));
      }
    }

    tempPath = path.join(dir, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    fs.writeFileSync(tempPath, await renderPDF(html));
    // Copiar o arquivo final evita a falha de renameSync comum no Windows ao substituir arquivos.
    fs.copyFileSync(tempPath, pdfPath);
    fs.unlinkSync(tempPath);
    tempPath = '';

    minuta.pdf = pdfPath;
    try { await registrarBanco(minuta, pdfPath); }
    catch (e) { if (bancoGoogle()) { try { fs.unlinkSync(pdfPath); } catch {} } throw e; }
    salvarHistorico(minuta);
    const openError = await shell.openPath(pdfPath);
    return { ok: true, path: pdfPath, warning: openError || undefined };
  } catch (err) {
    if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} }
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('minuta:csv', async (_e, minuta) => {
  try { const r = await registrarBanco(minuta, minuta.pdf && !/^https?:/i.test(minuta.pdf) && fs.existsSync(minuta.pdf) ? minuta.pdf : ''); salvarHistorico(minuta); return { ok: true, path: r.destino }; }
  catch (err) { return { ok: false, error: String(err).includes('EBUSY') ? 'A planilha está aberta no Excel. Feche-a e tente novamente.' : String(err) }; }
});

ipcMain.handle('minuta:imprimir', async (_e, html) => {
  let w;
  try {
    w = new BrowserWindow({
      show: false,
      width: 900,
      height: 1200,
      webPreferences: { contextIsolation: true, sandbox: true },
    });
    await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise((resolve) => setTimeout(resolve, 250));
    return await new Promise((resolve) => {
      w.webContents.print(
        { silent: false, printBackground: true, pageSize: 'A4', margins: { marginType: 'none' } },
        (success, reason) => {
          if (w && !w.isDestroyed()) w.destroy();
          resolve(success ? { ok: true } : { ok: false, error: reason || 'A impressão foi cancelada ou não pôde ser iniciada.' });
        }
      );
    });
  } catch (err) {
    if (w && !w.isDestroyed()) w.destroy();
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('csv:abrir', async () => {
  if (bancoGoogle()) {
    let url = sheetsEstado.planilhaUrl;
    if (!url) { try { url = (await sheetsPost({ acao: 'teste' }, 20000)).url; } catch {} }
    if (url) return shell.openExternal(url);
    return dialog.showMessageBox(win, { message: 'Não foi possível abrir a planilha do Google. Verifique a internet.' });
  } const p = getPlanilhaPath(); if (fs.existsSync(p)) shell.openPath(p); else dialog.showMessageBox(win, { message: 'A planilha ainda não foi criada no local configurado. Gere uma minuta primeiro.' }); });
ipcMain.handle('diagnostico:get', async () => {
  if (bancoGoogle()) {
    let ok = false, nome = 'Google Sheets', erro = '';
    try { const r = await sheetsPost({ acao: 'teste' }, 15000); ok = true; nome = r.planilha || nome; } catch (e) { erro = String(e?.message || e); }
    return {
      ok: true, banco: 'sheets', bancoErro: erro, appVersion: app.getVersion(), electronVersion: process.versions.electron, chromeVersion: process.versions.chrome, nodeVersion: process.versions.node,
      dataPath: DATA, planilhaPath: sheetsEstado.planilhaUrl || sheetsCfg().url, planilhaDir: 'Google Sheets · ' + nome,
      planilhaWritable: ok, planilha: { exists: ok, size: 0, modified: null }, historicoPath: f('historico.json'), configPath: f('config.json'), cachePath: f('cache-numero.json'),
      dbInfo: { enabled: true, type: 'Google Sheets + IndexedDB local', stores: ['app_meta', 'drafts', 'history_meta'], itemTable: false }
    };
  }
  try {
    const cfg = getConfigSeguro();
    const planilha = getPlanilhaPath();
    let writable = false;
    let planilhaInfo = null;
    try {
      fs.accessSync(cfg.planilhaDir, fs.constants.R_OK | fs.constants.W_OK);
      writable = true;
    } catch {}
    if (fs.existsSync(planilha)) {
      const st = fs.statSync(planilha);
      planilhaInfo = { exists: true, size: st.size, modified: st.mtime.toISOString() };
    } else {
      planilhaInfo = { exists: false, size: 0, modified: null };
    }
    return {
      ok: true,
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      dataPath: DATA,
      planilhaPath: planilha,
      planilhaDir: cfg.planilhaDir,
      planilhaWritable: writable,
      planilha: planilhaInfo,
      historicoPath: f('historico.json'),
      configPath: f('config.json'),
      cachePath: f('cache-numero.json'),
      dbInfo: { enabled: true, type: 'IndexedDB', stores: ['app_meta', 'drafts', 'history_meta'], itemTable: false }
    };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle('pdf:abrir', (_e, p) => (/^https?:\/\//i.test(String(p || '')) ? shell.openExternal(p) : shell.openPath(p)));

// =========================================================
// GOOGLE SHEETS (via Apps Script publicado como App da Web)
// Envio em segundo plano. Nunca bloqueia a geração da minuta:
// se a internet ou o Google falharem, o envio fica na fila
// (dados/sheets-fila.json) e é refeito automaticamente.
// =========================================================
const SHEETS_FILA = 'sheets-fila.json';
const MSG_SCRIPT_ANTIGO = 'O script do Google está desatualizado. No Apps Script, cole o novo GoogleSheets_Script.gs e publique em Implantar › Gerenciar implantações › lápis › Versão: Nova versão › Implantar.';
let sheetsEstado = { enviando: false, ultimoOk: null, ultimoErro: null, planilhaUrl: '' };

function sheetsCfg() {
  const c = getConfigSeguro().sheets || {};
  const url = String(c.url || '').trim();
  const banco = c.banco === 'sheets' && !!url;
  return { url, token: String(c.token || '').trim(), enviarPdf: c.enviarPdf !== false, ativo: (c.ativo !== false || banco) && !!url, banco, copiaCsv: c.copiaCsv !== false };
}
function lerFilaSheets() { const f = readJSON(SHEETS_FILA, []); return Array.isArray(f) ? f : []; }
function gravarFilaSheets(f) { try { writeJSON(SHEETS_FILA, f); } catch {} }

function resumoSheets() {
  const c = sheetsCfg();
  return { configurado: !!c.url, ativo: c.ativo, banco: c.banco, pendentes: lerFilaSheets().length, ...sheetsEstado };
}
function avisarSheets() {
  try { if (win && !win.isDestroyed()) win.webContents.send('sheets:status', resumoSheets()); } catch {}
}

async function sheetsPost(payload, timeoutMs = 30000, override = null) {
  const c = override ? { ...sheetsCfg(), url: String(override.url || '').trim(), token: String(override.token || '').trim() } : sheetsCfg();
  if (!c.url) throw new Error('Informe a URL do Google Sheets em Configurações.');
  if (!/^https:\/\//i.test(c.url)) throw new Error('A URL do Google Sheets deve começar com https://');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(c.url, {
      method: 'POST', redirect: 'follow', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, token: c.token }),
    });
    const texto = await r.text();
    let j;
    try { j = JSON.parse(texto); } catch {
      throw new Error(r.ok
        ? 'O Google respondeu algo inesperado. Confira se o script foi implantado como "App da Web" com acesso para "Qualquer pessoa".'
        : `O Google respondeu HTTP ${r.status}.`);
    }
    if (j.url) sheetsEstado.planilhaUrl = j.url;
    sheetsEstado.versaoScript = j.versao || sheetsEstado.versaoScript || '';
    // Script antigo (sem "versao") não conhece numeração/listagem: avisa de forma clara.
    if (['proximo', 'listar', 'teste'].includes(payload.acao) && !j.versao && (payload.acao !== 'teste' || bancoGoogle())) throw new Error(MSG_SCRIPT_ANTIGO);
    if (payload.validarSequencia && !j.versao) throw new Error(MSG_SCRIPT_ANTIGO);
    if (!j.ok) throw new Error(j.error || 'O Google Sheets recusou o envio.');
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Tempo esgotado ao falar com o Google.');
    throw e;
  } finally { clearTimeout(timer); }
}

function minutaParaSheets(m) {
  return {
    numero: String(m.numero || ''), data: m.data || '', dataISO: m.dataISO || '',
    volumes: String(m.volumes || ''), embalagem: m.embalagem || '',
    remetente: m.remetente?.nome || '', destinatario: m.destinatario?.nome || '',
    itens: (m.itens || []).map((i) => ({ pessoa: i.pessoa || '', ref: i.ref || '', qtd: i.qtd || 1, conteudo: i.conteudo || '', obs: i.obs || '' })),
    origem: require('os').hostname(),
    dados: { remetente: m.remetente || {}, destinatario: m.destinatario || {}, embalagens: m.embalagens || [], tipoEntrega: m.tipoEntrega || '', veiculo: m.veiculo || '', carimbo: m.carimbo || '' },
  };
}

function enfileirarSheets(acao, minuta, pdfPath) {
  const c = sheetsCfg();
  if (!c.ativo || !minuta) return;
  const numero = normalizarNumeroMinuta(minuta.numero);
  if (numero === null) return;
  // Um envio mais novo da mesma minuta substitui o anterior ainda pendente.
  const fila = lerFilaSheets().filter((x) => x.numero !== numero);
  fila.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), acao, numero, minuta: acao === 'excluir' ? { numero: String(minuta.numero) } : minutaParaSheets(minuta), pdfPath: pdfPath || '', tentativas: 0, criadoEm: new Date().toISOString() });
  gravarFilaSheets(fila);
  processarFilaSheets();
}

async function processarFilaSheets() {
  if (sheetsEstado.enviando || !sheetsCfg().ativo) { avisarSheets(); return; }
  sheetsEstado.enviando = true; avisarSheets();
  try {
    while (true) {
      const fila = lerFilaSheets();
      const item = fila[0];
      if (!item) break;
      const payload = { acao: item.acao, minuta: item.minuta };
      const c = sheetsCfg();
      if (item.acao === 'registrar' && c.enviarPdf && item.pdfPath) {
        try {
          const st = fs.statSync(item.pdfPath);
          if (st.size < 20 * 1024 * 1024) payload.pdf = { nome: path.basename(item.pdfPath), base64: fs.readFileSync(item.pdfPath).toString('base64') };
        } catch {}
      }
      try {
        await sheetsPost(payload);
        gravarFilaSheets(lerFilaSheets().filter((x) => x.id !== item.id));
        sheetsEstado.ultimoOk = { numero: item.minuta.numero, acao: item.acao, em: new Date().toISOString() };
        sheetsEstado.ultimoErro = null;
      } catch (err) {
        const msg = String(err?.message || err);
        const f2 = lerFilaSheets().map((x) => x.id === item.id ? { ...x, tentativas: (x.tentativas || 0) + 1, erro: msg } : x);
        gravarFilaSheets(f2);
        sheetsEstado.ultimoErro = { numero: item.minuta.numero, mensagem: msg, em: new Date().toISOString() };
        break; // provavelmente sem internet: tenta de novo mais tarde
      }
    }
  } finally {
    sheetsEstado.enviando = false;
    avisarSheets();
  }
}
setInterval(() => { if (lerFilaSheets().length) processarFilaSheets(); }, 5 * 60 * 1000);


// ---------- Google Sheets como BASE DE DADOS ----------
function bancoGoogle() { return sheetsCfg().banco; }
function pdfParaEnvio(pdfPath) {
  try {
    if (!pdfPath || !sheetsCfg().enviarPdf) return undefined;
    const st = fs.statSync(pdfPath);
    if (st.size >= 20 * 1024 * 1024) return undefined;
    return { nome: path.basename(pdfPath), base64: fs.readFileSync(pdfPath).toString('base64') };
  } catch { return undefined; }
}
function logBanco(msg) { try { fs.appendFileSync(f('google-sheets.log'), `[${new Date().toISOString()}] ${msg}\n`, 'utf8'); } catch {} }

// Grava a minuta na base configurada. Com o Google como base, a gravação é
// imediata e a sequência é validada no Google (dentro de um bloqueio).
async function registrarBanco(minuta, pdfPath) {
  if (!bancoGoogle()) { await registrarCSV(minuta); enfileirarSheets('registrar', minuta, pdfPath); return { destino: getPlanilhaPath() }; }
  const payload = { acao: 'registrar', validarSequencia: true, revisao: !!minuta.revisao, digitos: cfgDigitosFromLocalConfig(), minuta: minutaParaSheets(minuta) };
  const pdf = pdfParaEnvio(pdfPath); if (pdf) payload.pdf = pdf;
  try {
    await sheetsPost(payload, 90000);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('Próximo número disponível')) throw new Error(msg);
    throw new Error('Não foi possível gravar no Google Sheets (' + msg + '). A minuta NÃO foi registrada; confira a internet e tente de novo.');
  }
  const numero = normalizarNumeroMinuta(minuta.numero);
  gravarFilaSheets(lerFilaSheets().filter((x) => x.numero !== numero));
  sheetsEstado.ultimoOk = { numero: String(minuta.numero), acao: 'registrar', em: new Date().toISOString() };
  sheetsEstado.ultimoErro = null; avisarSheets();
  if (sheetsCfg().copiaCsv) {
    try { await registrarCSV({ ...minuta, revisao: true }); }
    catch (e) { logBanco('Cópia no registro_itens.csv não gravada: ' + (e?.message || e)); }
  }
  return { destino: sheetsEstado.planilhaUrl || 'Google Sheets' };
}

function embalagensDeTexto(tipoEmbalagem, volumeTexto) {
  const embalagens = [];
  String(tipoEmbalagem || '').split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean).forEach((parte) => {
    const m = parte.match(/^(\d+)\s+(.+)$/);
    if (m) embalagens.push({ quantidade: Math.max(1, parseInt(m[1], 10) || 1), tipo: m[2].toLowerCase().replace(/^(.)/, (x) => x.toUpperCase()).replace(/S$/i, '') });
  });
  if (!embalagens.length) embalagens.push({ quantidade: Math.max(1, parseInt(String(volumeTexto || '').match(/\d+/)?.[0] || '1', 10)), tipo: 'Malote' });
  return embalagens;
}

function historicoDeSheets(lista) {
  const anterior = readJSON('historico.json', []);
  const mapa = new Map(anterior.map((h) => [normalizarNumeroMinuta(h.numero), h]));
  const dig = cfgDigitosFromLocalConfig();
  const out = (lista || []).map((r) => {
    const num = normalizarNumeroMinuta(r.numero);
    if (num === null) return null;
    const antigo = mapa.get(num) || {};
    const d = r.dados || {};
    const embalagens = Array.isArray(d.embalagens) && d.embalagens.length ? d.embalagens : embalagensDeTexto(r.embalagem, r.volumes);
    const pdfLocal = antigo.pdf && !/^https?:/i.test(antigo.pdf) && fs.existsSync(antigo.pdf) ? antigo.pdf : '';
    return {
      ...antigo,
      numero: String(num).padStart(dig, '0'),
      data: parseDataHistorico(r.data), dataISO: dataISOHistorico(r.data) || antigo.dataISO || '',
      veiculo: d.veiculo || '', tipoEntrega: d.tipoEntrega || '',
      volumes: r.volumes || String(embalagens.reduce((n, x) => n + (Number(x.quantidade) || 0), 0)),
      embalagem: r.embalagem || '', embalagens,
      remetente: { ...(antigo.remetente || {}), ...(d.remetente || {}), nome: r.remetente || d.remetente?.nome || antigo.remetente?.nome || '' },
      destinatario: { ...(antigo.destinatario || {}), ...(d.destinatario || {}), nome: r.destinatario || d.destinatario?.nome || antigo.destinatario?.nome || '' },
      itens: Array.isArray(r.itens) ? r.itens : [],
      pdf: pdfLocal || r.pdf || '', pdfUrl: r.pdf || '',
      carimbo: d.carimbo || r.atualizadoEm || antigo.carimbo || '',
      revisao: true,
    };
  }).filter(Boolean);
  out.sort((a, b) => (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0));
  writeJSON('historico.json', out);
  return out;
}

ipcMain.handle('sheets:status', () => resumoSheets());
ipcMain.handle('sheets:reenviar', async () => { await processarFilaSheets(); return resumoSheets(); });
ipcMain.handle('sheets:testar', async (_e, tmp) => {
  // Testa a URL/código digitados na tela, mesmo antes de salvar.
  try { const r = await sheetsPost({ acao: 'teste' }, 20000, tmp && tmp.url ? tmp : null); return { ok: true, ...r }; }
  catch (err) { return { ok: false, error: String(err?.message || err) }; }
});
ipcMain.handle('sheets:sincronizarTudo', async () => {
  const c = sheetsCfg();
  if (!c.url) return { ok: false, error: 'Configure e salve a URL do Google Sheets primeiro.' };
  if (!c.ativo) return { ok: false, error: 'O envio ao Google Sheets está desativado.' };
  let historico = [];
  try { historico = fs.existsSync(getPlanilhaPath()) ? lerHistoricoCSVSemGravar() : readJSON('historico.json', []); } catch { historico = readJSON('historico.json', []); }
  const fila = lerFilaSheets();
  const jaNaFila = new Set(fila.map((x) => x.numero));
  let qtd = 0;
  for (const m of [...historico].reverse()) {
    const numero = normalizarNumeroMinuta(m.numero);
    if (numero === null || jaNaFila.has(numero)) continue;
    const pdfLocal = m.pdf && fs.existsSync(m.pdf) ? m.pdf : '';
    fila.push({ id: Date.now() + '-' + qtd, acao: 'registrar', numero, minuta: minutaParaSheets(m), pdfPath: pdfLocal, tentativas: 0, criadoEm: new Date().toISOString() });
    qtd++;
  }
  gravarFilaSheets(fila);
  if (c.banco) { await processarFilaSheets(); return { ok: true, enfileiradas: qtd, pendentes: lerFilaSheets().length, aguardou: true }; }
  processarFilaSheets();
  return { ok: true, enfileiradas: qtd, pendentes: fila.length };
});

