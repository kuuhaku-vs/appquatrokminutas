/* =========================================================
   GERADOR DE MINUTAS · PAINEL INICIAL (v3.5)
   - Tela "Início": saudação, números do dia/mês, atalhos,
     últimas minutas e pedidos aguardando.
   - Cada pessoa só vê os blocos que a permissão dela libera.
   - No celular a barra inferior fica com 4 telas + "Mais".
========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const ico = window.ICO || (() => '');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AUTH = () => window.AUTH;
  const pode = (p) => { const A = AUTH(); return !A || typeof A.pode !== 'function' ? true : !!A.pode(p); };
  const podeTela = (t) => { const A = AUTH(); return !A || typeof A.podeTela !== 'function' ? true : !!A.podeTela(t); };
  const irPara = (t) => window.go?.(t) ?? (typeof go === 'function' && go(t));

  // ---------- Marcação ----------
  document.querySelector('.sb-nav .sb-label')?.insertAdjacentHTML('beforebegin',
    '<button class="nav" data-go="inicio" data-ico="home"><span>Início</span><kbd>Alt 0</kbd></button>');

  document.querySelector('main.content')?.insertAdjacentHTML('beforeend', `
    <section id="v-inicio" class="view">
      <header class="vh in-head">
        <div class="vh-title"><div><span class="eyebrow" id="inData"></span><h2 id="inSaudacao">Olá</h2></div></div>
        <div class="vh-actions"><button class="ghost" id="inAtualizar" type="button" data-ico="refresh"><span>Atualizar</span></button></div>
      </header>
      <div class="in-kpis" id="inKpis"></div>
      <div class="in-atalhos" id="inAtalhos"></div>
      <div class="in-grid">
        <section class="card in-card" id="inMinutasCard">
          <div class="card-h"><h3 data-ico="history">Últimas minutas</h3><button class="lg-link" type="button" data-go="historico">Ver histórico</button></div>
          <div class="in-lista" id="inMinutas"></div>
        </section>
        <section class="card in-card" id="inPedidosCard">
          <div class="card-h"><h3 data-ico="inbox"><span id="inPedTitulo">Pedidos aguardando</span></h3><button class="lg-link" type="button" data-go="pedidos">Ver todos</button></div>
          <div class="in-lista" id="inPedidos"></div>
        </section>
      </div>
    </section>
    <div class="modal" id="mMais" aria-hidden="true"><div class="mbox sm-box" role="dialog" aria-modal="true" aria-labelledby="maisTitulo">
      <div class="m-head"><h3 id="maisTitulo">Mais telas</h3><button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button></div>
      <div class="m-body mais-lista" id="maisLista"></div>
    </div></div>`);

  // Botão "Mais" da barra inferior do celular (só aparece quando sobram telas).
  document.querySelector('.sb-nav')?.insertAdjacentHTML('beforeend',
    '<button class="nav nav-mais" id="navMais" type="button" data-ico="list" hidden><span>Mais</span></button>');
  window.hidratarIcones?.();

  const mMais = $('mMais');
  mMais.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => window.fecharModal?.(mMais)));
  mMais.addEventListener('mousedown', (e) => { if (e.target === mMais) window.fecharModal?.(mMais); });

  // Os botões com data-go criados aqui funcionam mesmo antes do app.js carregar.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('#v-inicio [data-go], #mMais [data-go]');
    if (!b) return;
    e.preventDefault();
    window.fecharModal?.(mMais);
    irPara(b.dataset.go);
    if (b.dataset.foco) setTimeout(() => $(b.dataset.foco)?.focus(), 120);
  });

  // ---------- Dados ----------
  const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const isoDe = (m) => {
    if (m.dataISO) return String(m.dataISO).slice(0, 10);
    const x = String(m.data || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return x ? `${x[3]}-${x[2]}-${x[1]}` : '';
  };
  const volumesDe = (m) => Number(m.volumes) || (m.embalagens || []).reduce((n, e) => n + (Number(e.quantidade) || 0), 0);
  let minutas = null, pedidos = null, carregando = false;

  function lerHistLocal() {
    try { if (typeof hist !== 'undefined' && Array.isArray(hist) && hist.length) return hist; } catch (e) { /* app.js ainda não carregou */ }
    try { return JSON.parse(localStorage.getItem('gm_web_hist_cache') || 'null'); } catch (e) { return null; }
  }

  async function carregar() {
    if (carregando) return;
    carregando = true;
    $('inAtualizar')?.classList.add('girando');
    minutas = minutas || lerHistLocal();
    render();
    const tarefas = [];
    if (pode('historico.ver') || pode('minutas.criar')) {
      tarefas.push((async () => {
        try { if (typeof store !== 'undefined') minutas = await store.getHist(); else if (window.api?.getHistorico) minutas = await window.api.getHistorico(); } catch (e) { /* mantém o que tinha */ }
      })());
    }
    if (podeTela('pedidos') && window.api?.auth) {
      tarefas.push((async () => {
        const r = await window.api.auth('pedidos.listar');
        if (r?.ok) pedidos = r.pedidos || [];
      })());
    }
    await Promise.all(tarefas);
    carregando = false;
    $('inAtualizar')?.classList.remove('girando');
    render();
  }

  // ---------- Desenho ----------
  function saudacao() {
    const h = new Date().getHours();
    const nome = (AUTH()?.usuario?.nome || '').trim().split(/\s+/)[0];
    $('inSaudacao').textContent = `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}${nome ? ', ' + nome : ''}`;
    const d = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    $('inData').textContent = d.charAt(0).toUpperCase() + d.slice(1);
  }

  function kpi(rotulo, valor, sub, icone, tom, destino) {
    return `<button type="button" class="in-kpi${tom ? ' ' + tom : ''}" ${destino ? `data-go="${destino}"` : 'disabled'}>
      <span class="in-kpi-ico">${ico(icone)}</span>
      <span class="in-kpi-txt"><small>${rotulo}</small><b>${valor}</b>${sub ? `<em>${sub}</em>` : ''}</span>
    </button>`;
  }

  function render() {
    if (!$('v-inicio')) return;
    saudacao();
    const verMinutas = pode('historico.ver') || pode('minutas.criar');
    const verPedidos = podeTela('pedidos');
    const atende = pode('minutas.criar') || pode('minutas.editar');
    const hoje = hojeISO(), mes = hoje.slice(0, 7);
    const lista = Array.isArray(minutas) ? minutas : [];
    const doDia = lista.filter((m) => isoDe(m) === hoje);
    const doMes = lista.filter((m) => isoDe(m).startsWith(mes));
    const aguard = (pedidos || []).filter((p) => p.situacao === 'AGUARDANDO');
    const carregado = (v) => (v === null ? '…' : v);

    const cards = [];
    if (verMinutas) {
      cards.push(kpi('Minutas hoje', carregado(minutas && doDia.length), doDia.length ? `${doDia.reduce((n, m) => n + (m.itens?.length || 0), 0)} itens` : 'nenhuma ainda', 'filePlus', '', 'historico'));
      cards.push(kpi('Minutas no mês', carregado(minutas && doMes.length), new Date().toLocaleDateString('pt-BR', { month: 'long' }), 'calendar', '', 'historico'));
      cards.push(kpi('Volumes no mês', carregado(minutas && doMes.reduce((n, m) => n + volumesDe(m), 0)), 'somando todas as minutas', 'package', '', 'historico'));
    }
    if (verPedidos) {
      cards.push(kpi(atende ? 'Pedidos aguardando' : 'Meus pedidos aguardando', carregado(pedidos && aguard.length), aguard.length ? (atende ? 'clique para ver e incluir' : 'clique para acompanhar') : 'tudo em dia', 'inbox', aguard.length ? 'alerta' : 'ok', 'pedidos'));
    }
    $('inKpis').innerHTML = cards.join('');
    $('inKpis').dataset.n = cards.length;

    const atalhos = [];
    if (pode('minutas.criar')) atalhos.push(['nova', 'filePlus', 'Nova minuta', 'Montar um malote', '']);
    if (pode('pedidos.criar')) atalhos.push(['pedidos', 'send', 'Pedir um envio', 'Para quem monta o malote', 'pedDe']);
    if (podeTela('frete')) atalhos.push(['frete', 'mail', 'Frete cortesia', 'Etiqueta e malote', '']);
    if (pode('historico.ver')) atalhos.push(['historico', 'search', 'Buscar minuta', 'No histórico', 'busca']);
    $('inAtalhos').innerHTML = atalhos.map(([go, ic, t, s, foco]) => `<button type="button" class="in-atalho" data-go="${go}"${foco ? ` data-foco="${foco}"` : ''}><span class="in-atalho-ico">${ico(ic)}</span><span><b>${t}</b><small>${s}</small></span>${ico('chevronRight', 'in-seta')}</button>`).join('');
    $('inAtalhos').hidden = !atalhos.length;

    $('inMinutasCard').hidden = !pode('historico.ver');
    if (pode('historico.ver')) {
      const ult = [...lista].sort((a, b) => (isoDe(b) + b.numero).localeCompare(isoDe(a) + a.numero)).slice(0, 5);
      $('inMinutas').innerHTML = minutas === null ? '<p class="in-vazio">Carregando…</p>' : ult.length ? ult.map((m) => `
        <button type="button" class="in-linha" data-go="historico">
          <span class="in-num">nº ${esc(m.numero)}</span>
          <span class="in-linha-txt"><b>${esc(m.destinatario?.nome || 'Sem destinatário')}</b><small>${esc(m.data || '')} · ${m.itens?.length || 0} ${m.itens?.length === 1 ? 'item' : 'itens'} · ${volumesDe(m) || 0} vol.</small></span>
        </button>`).join('') : '<p class="in-vazio">Nenhuma minuta registrada ainda.</p>';
    }

    $('inPedidosCard').hidden = !verPedidos;
    if (verPedidos) {
      $('inPedTitulo').textContent = atende ? 'Pedidos aguardando' : 'Meus pedidos aguardando';
      $('inPedidos').innerHTML = pedidos === null ? '<p class="in-vazio">Carregando…</p>' : aguard.length ? aguard.slice(0, 5).map((p) => `
        <button type="button" class="in-linha" data-go="pedidos">
          <span class="in-ped-ico">${ico('send')}</span>
          <span class="in-linha-txt"><b>${esc(p.para)}</b><small>de ${esc(p.de)} · ${esc(p.qtd)} × ${esc(p.conteudo)}${atende && p.nome ? ' · pedido por ' + esc(p.nome) : ''}</small></span>
          <em class="in-quando">${esc(String(p.criadoEm || '').split(' ')[0])}</em>
        </button>`).join('') : `<p class="in-vazio">${atende ? 'Nenhum pedido esperando para entrar no malote.' : 'Você não tem pedidos aguardando.'}</p>`;
    }
    const grid = document.querySelector('#v-inicio .in-grid');
    grid.classList.toggle('um', $('inMinutasCard').hidden !== $('inPedidosCard').hidden);
    grid.hidden = $('inMinutasCard').hidden && $('inPedidosCard').hidden;
  }

  $('inAtualizar').addEventListener('click', () => carregar());

  // ---------- Barra inferior do celular: 4 telas + "Mais" ----------
  const PRIORIDADE = ['inicio', 'nova', 'pedidos', 'historico'];
  const celular = matchMedia('(max-width: 760px)');
  function arrumarBarra() {
    const navs = [...document.querySelectorAll('.sb-nav .nav[data-go]')];
    navs.forEach((n) => n.classList.remove('mb-extra'));
    const mais = $('navMais');
    const visiveis = navs.filter((n) => getComputedStyle(n).display !== 'none');
    if (!celular.matches || visiveis.length <= 5) { mais.hidden = true; return; }
    const ficam = visiveis.filter((n) => PRIORIDADE.includes(n.dataset.go)).slice(0, 4);
    const extras = visiveis.filter((n) => !ficam.includes(n));
    extras.forEach((n) => n.classList.add('mb-extra'));
    mais.hidden = false;
    $('maisLista').innerHTML = extras.map((n) => `<button type="button" class="mais-item" data-go="${n.dataset.go}">${n.querySelector('svg')?.outerHTML || ''}<span>${esc(n.querySelector('span')?.textContent || n.dataset.go)}</span>${n.querySelector('.nav-badge:not([hidden])') ? `<b class="nav-badge">${esc(n.querySelector('.nav-badge').textContent)}</b>` : ''}</button>`).join('');
    const ativoExtra = extras.some((n) => n.dataset.go === document.body.dataset.screen);
    mais.classList.toggle('active', ativoExtra);
  }
  $('navMais').addEventListener('click', () => { arrumarBarra(); window.abrirModal?.(mMais); });
  celular.addEventListener?.('change', arrumarBarra);

  // Reage às trocas de tela (o app.js marca body[data-screen]).
  new MutationObserver(() => {
    const tela = document.body.dataset.screen;
    if (tela === 'inicio') carregar();
    // Frete cortesia é uma aba da Nova minuta: o menu continua marcando "Nova minuta".
    document.querySelector('.sb-nav .nav[data-go="nova"]')?.classList.toggle('active', tela === 'nova' || tela === 'frete');
    arrumarBarra();
  }).observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });
  window.addEventListener('gm-entrou', () => setTimeout(arrumarBarra, 50));
  window.addEventListener('gm-usuario-atualizado', () => { arrumarBarra(); render(); });
  setTimeout(arrumarBarra, 300);

  window.INICIO = { render, carregar, arrumarBarra };
})();
