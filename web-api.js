/* =========================================================
   GERADOR DE MINUTAS · CAMADA WEB (navegador / celular)
   No programa do Windows quem atende window.api é o preload.cjs (Electron).
   No navegador (GitHub Pages) este arquivo cria o mesmo window.api e fala
   direto com o Apps Script da planilha "Gerador de Minutas - 4K".
   A planilha do Google é a base de dados: numeração, histórico e exclusões.
========================================================= */
(function () {
  if (window.api) return; // programa do Windows: nada a fazer aqui

  const CFG = window.MINUTAS_CONFIG || {};
  const K_CFG = 'gm_web_cfg_v1', K_URLSHEET = 'gm_web_sheet_url';
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const MSG_ANTIGO = 'O script do Google está desatualizado. Publique a versão nova do GoogleSheets_Script.gs (Implantar › Gerenciar implantações › lápis › Nova versão).';

  function lerCfg() {
    const c = lsGet(K_CFG, {}) || {};
    const sheets = { ...(c.sheets || {}) };
    if (!sheets.url) sheets.url = String(CFG.scriptUrl || '').trim();
    sheets.banco = 'sheets'; sheets.ativo = true; sheets.copiaCsv = false; sheets.enviarPdf = false;
    return { digitos: CFG.digitos || 6, ...c, sheets };
  }
  const cfgSheets = () => lerCfg().sheets;
  const digitos = () => Math.max(1, Number(lerCfg().digitos) || 6);

  let estado = { enviando: false, ultimoOk: null, ultimoErro: null };
  let sessao = ''; // sessão do usuário logado (definida pelo auth.js)
  const ouvintes = [];
  function status() {
    const s = cfgSheets();
    return { configurado: !!(s.url && (sessao || s.token)), ativo: true, banco: true, pendentes: 0, ...estado };
  }
  const avisar = () => ouvintes.forEach((cb) => { try { cb(status()); } catch {} });

  async function remoto(payload, { timeout = 45000, override = null } = {}) {
    const s = override ? { ...cfgSheets(), ...override } : cfgSheets();
    if (!s.url) { const e = new Error('Informe a URL do Google Sheets em Configurações.'); e.codigo = 'semurl'; throw e; }
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
    let r;
    try {
      // text/plain: o Google aceita sem pedido prévio de permissão (CORS)
      r = await fetch(s.url, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, token: s.token || undefined, sessao: sessao || undefined }) });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'O Google Sheets não respondeu a tempo. Confira a internet.' : 'Sem conexão com o Google Sheets. Confira a internet.');
    } finally { clearTimeout(t); }
    let j;
    try { j = await r.json(); } catch { throw new Error('O Google respondeu de um jeito inesperado. Confira a URL do App da Web.'); }
    if (j && j.url) lsSet(K_URLSHEET, j.url);
    if (j && !j.versao) { const e = new Error(MSG_ANTIGO); e.versao = '0'; throw e; }
    if (!j || !j.ok) {
      const e = new Error((j && j.error) || 'O Google Sheets recusou o pedido.');
      e.codigo = j && j.codigo; e.versao = (j && j.versao) || '0';
      if (e.codigo === 'login') window.dispatchEvent(new CustomEvent('gm-sessao-encerrada'));
      throw e;
    }
    return j;
  }

  // ---------- conversões (mesmas regras do programa do Windows) ----------
  const normNum = (v) => { const s = String(v ?? '').trim().replace(/\D/g, ''); return s ? String(parseInt(s, 10)) : null; };
  function dataISO(v) { const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''); }
  function embalagensDeTexto(t, vol) {
    const out = [];
    String(t || '').split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean).forEach((p) => {
      const m = p.match(/^(\d+)\s+(.+)$/);
      if (m) out.push({ quantidade: Math.max(1, parseInt(m[1], 10) || 1), tipo: m[2].toLowerCase().replace(/^(.)/, (x) => x.toUpperCase()).replace(/S$/i, '') });
    });
    if (!out.length) out.push({ quantidade: Math.max(1, parseInt(String(vol || '').match(/\d+/)?.[0] || '1', 10)), tipo: 'Malote' });
    return out;
  }
  function paraSheets(m) {
    return {
      numero: String(m.numero || ''), data: m.data || '', dataISO: m.dataISO || '', volumes: String(m.volumes || ''), embalagem: m.embalagem || '',
      remetente: m.remetente?.nome || '', destinatario: m.destinatario?.nome || '',
      itens: (m.itens || []).map((i) => ({ pessoa: i.pessoa || '', ref: i.ref || '', qtd: i.qtd || 1, conteudo: i.conteudo || '', obs: i.obs || '' })),
      origem: 'Web · ' + (/(iPhone|iPad|Android)/i.exec(navigator.userAgent)?.[1] || 'navegador'),
      dados: { remetente: m.remetente || {}, destinatario: m.destinatario || {}, embalagens: m.embalagens || [], tipoEntrega: m.tipoEntrega || '', veiculo: m.veiculo || '', carimbo: m.carimbo || '' },
    };
  }
  function historicoDe(lista) {
    const d = digitos();
    return (lista || []).map((r) => {
      const num = normNum(r.numero); if (num === null) return null;
      const x = r.dados || {};
      const emb = Array.isArray(x.embalagens) && x.embalagens.length ? x.embalagens : embalagensDeTexto(r.embalagem, r.volumes);
      return {
        numero: num.padStart(d, '0'), data: r.data || '', dataISO: dataISO(r.data), veiculo: x.veiculo || '', tipoEntrega: x.tipoEntrega || '',
        volumes: r.volumes || String(emb.reduce((n, e) => n + (Number(e.quantidade) || 0), 0)), embalagem: r.embalagem || '', embalagens: emb,
        remetente: { ...(x.remetente || {}), nome: r.remetente || x.remetente?.nome || '' },
        destinatario: { ...(x.destinatario || {}), nome: r.destinatario || x.destinatario?.nome || '' },
        itens: Array.isArray(r.itens) ? r.itens : [], pdf: r.pdf || '', carimbo: x.carimbo || r.atualizadoEm || '', revisao: true,
      };
    }).filter(Boolean).sort((a, b) => (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0));
  }

  // Impressão / "Salvar como PDF" pelo próprio navegador (funciona no celular).
  function imprimirHTML(html) {
    return new Promise((resolve) => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
      document.body.appendChild(f);
      const doc = f.contentWindow.document;
      doc.open(); doc.write(String(html).replace(/<script[\s\S]*?<\/script>/gi, '')); doc.close();
      setTimeout(() => {
        try { f.contentWindow.focus(); f.contentWindow.print(); resolve({ ok: true }); }
        catch (e) { resolve({ ok: false, error: 'Não foi possível abrir a impressão: ' + e.message }); }
        setTimeout(() => f.remove(), 60000);
      }, 350);
    });
  }

  async function registrar(minuta) {
    await remoto({ acao: 'registrar', validarSequencia: true, revisao: !!minuta.revisao, digitos: digitos(), minuta: paraSheets(minuta) }, { timeout: 60000 });
    estado.ultimoOk = { numero: String(minuta.numero), acao: 'registrar', em: new Date().toISOString() }; estado.ultimoErro = null; avisar();
  }
  const erroTxt = (e) => String(e?.message || e);

  window.api = {
    web: true,
    getConfig: async () => lerCfg(),
    setConfig: async (c) => { const atual = lerCfg(); const s = { ...(c?.sheets || {}) }; lsSet(K_CFG, { ...atual, ...(c || {}), sheets: { url: s.url || atual.sheets.url, token: s.token ?? atual.sheets.token } }); avisar(); return true; },
    escolherPlanilha: async () => ({ ok: false, error: 'Disponível só no programa do computador.' }),
    proximoNumero: async (d) => {
      try { const r = await remoto({ acao: 'proximo', digitos: Math.max(1, Number(d) || digitos()) }, { timeout: 25000 }); return { ok: true, numero: r.numero }; }
      catch (e) { return { ok: false, error: erroTxt(e) }; }
    },
    verificarDuplicatas: async () => {
      try { const r = await remoto({ acao: 'proximo', digitos: digitos() }, { timeout: 25000 }); return { ok: true, exists: true, max: r.max, used: [], duplicates: [] }; }
      catch (e) { return { ok: false, error: erroTxt(e) }; }
    },
    getHistorico: async () => {
      try { const r = await remoto({ acao: 'listar' }, { timeout: 60000 }); const h = historicoDe(r.minutas); lsSet('gm_web_hist_cache', h); return h; }
      catch { return lsGet('gm_web_hist_cache', []); }
    },
    excluirMinuta: async (numero) => {
      try {
        const r = await remoto({ acao: 'excluir', minuta: { numero: String(numero) } });
        if (!r.removidas) return { ok: false, error: `A minuta nº ${numero} não foi encontrada no Google Sheets.` };
        return { ok: true, numero: normNum(numero), removidas: r.removidas };
      } catch (e) { return { ok: false, error: erroTxt(e) }; }
    },
    gerarPDF: async (minuta, html) => {
      try { await registrar(minuta); } catch (e) { return { ok: false, error: erroTxt(e) }; }
      const p = await imprimirHTML(html);
      return { ok: true, path: 'Google Sheets', warning: p.ok ? undefined : p.error };
    },
    gerarCSV: async (minuta) => {
      try { await registrar(minuta); return { ok: true, path: 'Google Sheets' }; }
      catch (e) { return { ok: false, error: erroTxt(e) }; }
    },
    imprimir: (html) => imprimirHTML(html),
    abrirDados: async () => false,
    abrirCSV: async () => { const u = lsGet(K_URLSHEET, ''); if (u) window.open(u, '_blank', 'noopener'); else { try { const r = await remoto({ acao: 'teste' }); window.open(r.url, '_blank', 'noopener'); } catch (e) { alert(erroTxt(e)); } } },
    abrirPDF: async (p) => { if (/^https?:\/\//i.test(String(p || ''))) window.open(p, '_blank', 'noopener'); },
    dataPath: async () => 'Este navegador (cadastros e rascunhos ficam neste aparelho)',
    diagnostico: async () => {
      let ok = false, nome = 'Google Sheets', erro = '';
      try { const r = await remoto({ acao: 'teste' }, { timeout: 20000 }); ok = true; nome = r.planilha || nome; } catch (e) { erro = erroTxt(e); }
      return { ok: true, banco: 'sheets', bancoErro: erro, appVersion: 'web', electronVersion: '—', nodeVersion: '—', dataPath: 'Este navegador',
        planilhaPath: lsGet(K_URLSHEET, '') || cfgSheets().url, planilhaDir: 'Google Sheets · ' + nome, planilhaWritable: ok,
        planilha: { exists: ok }, historicoPath: '—', dbInfo: { type: 'Google Sheets + navegador' } };
    },
    sheetsStatus: async () => status(),
    sheetsTestar: async (tmp) => {
      try { const r = await remoto({ acao: 'teste' }, { timeout: 20000, override: tmp && tmp.url ? { url: tmp.url, token: tmp.token } : null }); return { ok: true, ...r }; }
      catch (e) { return { ok: false, error: erroTxt(e) }; }
    },
    sheetsReenviar: async () => status(),
    sheetsSincronizarTudo: async () => ({ ok: false, error: 'Disponível só no programa do computador.' }),
    // Login e usuários: conversa com o script e devolve a resposta inteira (auth.js decide o que fazer).
    auth: async (acao, dados) => {
      try { return await remoto({ acao: String(acao), ...(dados || {}) }, { timeout: 30000 }); }
      catch (e) { return { ok: false, error: erroTxt(e), codigo: e.codigo, versao: e.versao }; }
    },
    authSessao: async (token) => { sessao = String(token || ''); avisar(); return true; },
    onSheetsStatus: (cb) => { ouvintes.push(cb); return () => { const i = ouvintes.indexOf(cb); if (i >= 0) ouvintes.splice(i, 1); }; },
  };

  // Elementos que só fazem sentido no programa do Windows.
  document.documentElement.classList.add('is-web');
})();
