/* =========================================================
   GERADOR DE MINUTAS · CAMADA VISUAL (v2.1)
   Ícones, tema claro/escuro e status da planilha.
   Não altera regras de negócio: apenas apresentação.
========================================================= */
(function () {
  const P = {
    filePlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14h6"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
    listPlus: '<path d="M3 6h12M3 12h12M3 18h8"/><path d="M18 15v6M15 18h6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    pin: '<path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    flag: '<path d="M4 21V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
    package: '<path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'
  };
  const ico = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  window.ICO = ico;

  const hidratar = (root = document) => root.querySelectorAll('[data-ico]').forEach((el) => {
    if (el.dataset.icoDone) return;
    el.insertAdjacentHTML('afterbegin', ico(el.dataset.ico));
    el.dataset.icoDone = '1';
  });
  window.hidratarIcones = hidratar;
  hidratar();

  // ---------- Janela aberta trava a rolagem da página ----------
  // Enquanto houver qualquer janela (modal) aberta, só ela rola; a página volta a rolar quando a última fecha.
  // No celular quem rola é a página inteira: ela é "congelada" no lugar e volta ao mesmo ponto ao fechar.
  let travado = false, yGuardado = 0, fixou = false;
  const travarRolagem = () => {
    const aberta = !!document.querySelector('.modal.open');
    if (aberta === travado) return;
    travado = aberta;
    const raiz = document.documentElement, pag = document.scrollingElement || raiz, st = document.body.style;
    if (aberta) {
      yGuardado = pag.scrollTop;
      fixou = pag.scrollHeight > pag.clientHeight + 1;
      if (fixou) { st.position = 'fixed'; st.top = -yGuardado + 'px'; st.left = '0'; st.right = '0'; }
      raiz.classList.add('modal-aberto');
    } else {
      raiz.classList.remove('modal-aberto');
      if (fixou) { st.position = ''; st.top = ''; st.left = ''; st.right = ''; window.scrollTo(0, yGuardado); fixou = false; }
    }
  };
  new MutationObserver(travarRolagem).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  travarRolagem();

  // ---------- Tema claro / escuro ----------
  const raiz = document.documentElement;
  const botoesTema = document.querySelectorAll('#btnTema, [data-tema-toggle]');
  const aplicarTema = (t) => {
    raiz.dataset.theme = t;
    try { localStorage.setItem('gm-tema', t); } catch {}
    botoesTema.forEach((b) => {
      b.innerHTML = ico(t === 'light' ? 'moon' : 'sun');
      b.title = t === 'light' ? 'Usar tema escuro' : 'Usar tema claro';
    });
  };
  aplicarTema(raiz.dataset.theme === 'light' ? 'light' : 'dark');
  botoesTema.forEach((b) => b.addEventListener('click', () => aplicarTema(raiz.dataset.theme === 'light' ? 'dark' : 'light')));

  // ---------- Status da planilha compartilhada ----------
  const status = document.getElementById('sbStatus');
  const txt = document.getElementById('sbStatusText');
  const sub = document.getElementById('sbStatusSub');
  async function verificarPlanilha() {
    if (!status) return;
    if (!window.api?.diagnostico) { status.dataset.state = 'warn'; txt.textContent = 'Modo navegador'; sub.textContent = 'Planilha indisponível'; return; }
    try {
      const d = await window.api.diagnostico();
      if (!d?.ok) throw new Error(d?.error || 'falha');
      const ok = !!d.planilha?.exists && !!d.planilhaWritable;
      if (d.banco === 'sheets') {
        status.dataset.state = ok ? 'ok' : 'bad';
        const antigo = /desatualizado/i.test(d.bancoErro || ''), semCodigo = /código de acesso/i.test(d.bancoErro || '');
        status.dataset.state = ok ? 'ok' : (semCodigo ? 'warn' : 'bad');
        txt.textContent = ok ? 'Base no Google Sheets' : (antigo ? 'Script do Google desatualizado' : semCodigo ? 'Falta o código de acesso' : 'Google Sheets inacessível');
        sub.textContent = ok ? (d.planilhaDir || '').replace(/^Google Sheets · /, '') : (antigo ? 'Publique uma "Nova versão"' : semCodigo ? 'Configurações › Google Sheets' : 'Verifique a internet');
        status.title = d.bancoErro || status.title;
      } else {
        status.dataset.state = ok ? 'ok' : (d.planilhaWritable ? 'warn' : 'bad');
        txt.textContent = ok ? 'Planilha conectada' : (d.planilhaWritable ? 'Planilha ainda não criada' : 'Planilha inacessível');
        sub.textContent = d.planilhaDir || '';
      }
      status.title = d.planilhaPath || '';
      const mt = document.getElementById('mTopStatus'); if (mt) mt.textContent = txt.textContent;
    } catch {
      status.dataset.state = 'bad'; txt.textContent = 'Planilha inacessível'; sub.textContent = 'Verifique em Configurações';
    }
  }
  window.verificarPlanilhaUI = verificarPlanilha;
  setTimeout(verificarPlanilha, 600);
  setInterval(verificarPlanilha, 60000);
  window.addEventListener('focus', verificarPlanilha);
})();
