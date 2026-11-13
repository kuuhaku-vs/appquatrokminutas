/* =========================================================
   GERADOR DE MINUTAS · PEDIDOS DE ENVIO (v2.6)
   - Quem tem "Pedir envios" (perfil Consulta) lança um pedido:
     de quem, para quem, quantidade, conteúdo e observação.
   - Quem cria minutas recebe o aviso (contador, faixa na Nova minuta
     e notificação) e inclui o pedido no malote com um clique.
   - Ao gerar o PDF ou registrar a minuta, o script do Google marca
     o pedido como incluído, com o número da minuta.
========================================================= */
(function () {
  const api = window.api;
  if (!api) return;
  const $ = (id) => document.getElementById(id);
  const ico = window.ICO || (() => '');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CONTEUDOS = ['Envelope', 'Pacote', 'Caixa', 'Outros'];

  // ---------- Marcação ----------
  document.querySelector('.sb-nav [data-go="frete"]')?.insertAdjacentHTML('afterend',
    '<button class="nav" data-go="pedidos" data-ico="inbox"><span>Pedidos</span><b class="nav-badge" id="pedBadge" hidden></b></button>');

  document.querySelector('#v-nova > header')?.insertAdjacentHTML('afterend', `
    <div class="ped-banner" id="pedBanner" hidden>
      <span class="ped-banner-ico" data-ico="bell"></span>
      <div><strong id="pedBannerTxt"></strong><small id="pedBannerSub"></small></div>
      <button class="ghost sm" id="pedBannerAvisos" type="button" hidden>Avisar com o app minimizado</button>
      <button class="primary sm" id="pedBannerVer" type="button">Ver e incluir</button>
    </div>`);

  document.querySelector('main.content')?.insertAdjacentHTML('beforeend', `
    <section id="v-pedidos" class="view">
      <header class="vh">
        <div class="vh-title"><div><span class="eyebrow">Operação</span><h2>Pedidos de envio</h2></div></div>
        <div class="vh-actions"><button class="ghost" id="pedAtualizar" type="button" data-ico="refresh"><span>Atualizar</span></button></div>
      </header>
      <div class="ped-grid">
        <section class="card" id="pedNovoCard">
          <div class="card-h"><h3 data-ico="send">Novo pedido</h3></div>
          <p class="hint ped-hint">Diga de quem para quem vai o envio. Quem monta o malote recebe o aviso e inclui o seu pedido.</p>
          <div class="fgrid">
            <label class="field span2"><span>Quem está enviando</span><input id="pedDe" list="pessoasList" maxlength="80" autocomplete="off" placeholder="Ex.: Mariana - Expedição" /></label>
            <label class="field span2"><span>Para quem vai</span><input id="pedPara" list="destinosList" maxlength="80" autocomplete="off" placeholder="Ex.: Sheila - Recepção" /></label>
            <label class="field"><span>Quantidade</span><input id="pedQtd" type="number" min="1" max="999" value="1" /></label>
            <label class="field"><span>Conteúdo</span><select id="pedConteudo">${CONTEUDOS.map((c) => `<option>${c}</option>`).join('')}</select></label>
            <label class="field span2"><span>Observação <i>(opcional)</i></span><textarea id="pedObs" rows="2" maxlength="200" placeholder="Ex.: entregar em mãos, frágil, urgente…"></textarea></label>
          </div>
          <div class="btn-row ped-enviar"><button class="primary" id="pedEnviar" type="button" data-ico="send"><span>Enviar pedido</span></button></div>
        </section>
        <section class="card" id="pedListaCard">
          <div class="card-h">
            <h3 data-ico="inbox"><span id="pedListaTitulo">Aguardando</span> <span class="section-counter" id="pedContador"></span></h3>
            <div class="card-actions"><button class="primary" id="pedIncluir" type="button" data-ico="plus" hidden disabled><span>Incluir na minuta</span></button></div>
          </div>
          <div id="pedAguardando" class="ped-lista"></div>
          <div class="ped-sub-row"><span class="sub-title ped-sub">Atendidos recentemente</span><button class="ghost sm ped-limpar" id="pedLimpar" type="button" data-ico="trash" hidden><span>Excluir recusados e cancelados</span></button></div>
          <div id="pedHistorico" class="ped-lista"></div>
        </section>
      </div>
    </section>`);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" id="mPedidos" aria-hidden="true"><div class="mbox lg ped-modal" role="dialog" aria-modal="true" aria-labelledby="pedModalTitulo">
      <div class="m-head">
        <div class="m-title"><span class="m-badge" data-ico="bell"></span><div><h3 id="pedModalTitulo">Pedidos de envio aguardando</h3><p id="pedModalSub"></p></div></div>
        <button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button>
      </div>
      <div class="m-body"><div id="pedModalLista" class="ped-lista"></div></div>
      <div class="m-foot"><button class="ghost" id="pedModalTodos" type="button">Marcar todos</button><button class="ghost" data-close type="button">Cancelar</button><button class="primary" id="pedModalIncluir" type="button" disabled>Incluir no malote</button></div>
    </div></div>
    <div class="modal" id="mPedRecusar" aria-hidden="true"><div class="mbox sm-box" role="dialog" aria-modal="true" aria-labelledby="pedRecTitulo">
      <div class="m-head"><h3 id="pedRecTitulo">Recusar pedido</h3><button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button></div>
      <div class="m-body">
        <p id="pedRecResumo"></p>
        <label class="field"><span>Motivo <i>(a pessoa que pediu vai ver)</i></span><textarea id="pedRecMotivo" rows="3" maxlength="200" placeholder="Ex.: vai pelo correio, já foi enviado ontem…"></textarea></label>
      </div>
      <div class="m-foot"><button class="ghost" data-close type="button">Voltar</button><button class="danger-primary" id="pedRecConfirmar" type="button">Recusar pedido</button></div>
    </div></div>`);
  window.hidratarIcones?.();

  // As janelas novas fecham pelo X, pelo fundo e pelo Esc como as outras.
  ['mPedidos', 'mPedRecusar'].forEach((id) => {
    const m = $(id);
    m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => window.fecharModal?.(m)));
    m.addEventListener('mousedown', (e) => { if (e.target === m) window.fecharModal?.(m); });
  });

  // ---------- Estado ----------
  let pedidos = [], podeAtender = false, podeExcluir = false, entrou = false, carregando = false, primeiraCarga = true;
  let conhecidos = new Set();           // pedidos aguardando já avisados (quem atende)
  const situacaoAnterior = new Map();    // situação dos meus pedidos (quem pede)
  const AUTH = () => window.AUTH;
  const pode = (p) => !!AUTH()?.pode?.(p);
  const atende = () => pode('minutas.criar') || pode('minutas.editar');
  const usaPedidos = () => entrou && (atende() || pode('pedidos.criar') || pode('pedidos.excluir'));
  const descartavel = (p) => p.situacao === 'RECUSADO' || p.situacao === 'CANCELADO';
  const aguardando = () => pedidos.filter((p) => p.situacao === 'AGUARDANDO');
  const naMinuta = () => new Set(window.MINUTA?.idsDePedidos?.() || []);
  const resumo = (p) => `${p.de} → ${p.para}`;

  // ---------- Carregar e avisar ----------
  async function carregar({ silencioso = true } = {}) {
    if (!usaPedidos() || carregando) return;
    carregando = true;
    try {
      const r = await api.auth('pedidos.listar');
      if (!r?.ok) {
        if (!silencioso) window.toast?.(r?.versao && parseFloat(r.versao) < 2.6 ? 'Os pedidos de envio precisam da versão 2.6 do script do Google.' : (r?.error || 'Não foi possível carregar os pedidos.'), true);
        return;
      }
      pedidos = r.pedidos || []; podeAtender = !!r.podeAtender; podeExcluir = !!r.podeExcluir;
      notificar();
      atualizarAvisos();
      if (document.body.dataset.screen === 'pedidos') render();
      if ($('mPedidos').classList.contains('open')) renderModal();
    } finally { carregando = false; }
  }

  function notificar() {
    const fila = aguardando();
    if (podeAtender) {
      const novos = fila.filter((p) => !conhecidos.has(p.id));
      if (primeiraCarga && fila.length) window.toast?.(fila.length === 1 ? 'Há 1 pedido de envio aguardando para incluir no malote.' : `Há ${fila.length} pedidos de envio aguardando para incluir no malote.`);
      else if (!primeiraCarga && novos.length) {
        const txt = novos.length === 1 ? `Novo pedido de envio de ${novos[0].nome}: ${resumo(novos[0])}` : `${novos.length} novos pedidos de envio aguardando.`;
        window.toast?.(txt);
        avisoDoSistema('Pedido de envio', txt);
      }
      conhecidos = new Set(fila.map((p) => p.id));
    }
    // Quem pediu fica sabendo quando o pedido entra num malote ou é recusado.
    const eu = AUTH()?.usuario?.usuario;
    pedidos.filter((p) => !eu || p.usuario === eu).forEach((p) => {
      const antes = situacaoAnterior.get(p.id);
      if (!primeiraCarga && antes === 'AGUARDANDO' && p.situacao !== 'AGUARDANDO' && p.situacao !== 'CANCELADO' && (!podeAtender || p.usuario === eu)) {
        if (p.situacao === 'INCLUÍDO') { const t = `Seu pedido ${resumo(p)} foi incluído na minuta nº ${p.minuta}.`; window.toast?.(t); avisoDoSistema('Pedido incluído', t); }
        if (p.situacao === 'RECUSADO') window.toast?.(`Seu pedido ${resumo(p)} foi recusado${p.motivo ? ': ' + p.motivo : '.'}`, true);
      }
      situacaoAnterior.set(p.id, p.situacao);
    });
    primeiraCarga = false;
  }

  function avisoDoSistema(titulo, corpo) {
    try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(titulo, { body: corpo, icon: 'icon-192.png', tag: 'gm-pedidos' }); } catch {}
  }

  function atualizarAvisos() {
    const fila = aguardando(), dentro = naMinuta();
    const fora = fila.filter((p) => !dentro.has(p.id));
    const badge = $('pedBadge');
    if (badge) { const n = podeAtender ? fora.length : 0; badge.hidden = !n; badge.textContent = n ? String(n) : ''; }
    const banner = $('pedBanner');
    if (banner) {
      banner.hidden = !podeAtender || !fora.length;
      $('pedBannerTxt').textContent = fora.length === 1 ? '1 pedido de envio aguardando' : `${fora.length} pedidos de envio aguardando`;
      $('pedBannerSub').textContent = fora.slice(0, 2).map((p) => `${resumo(p)} (${p.nome})`).join(' · ') + (fora.length > 2 ? ` · e mais ${fora.length - 2}` : '');
      $('pedBannerAvisos').hidden = !('Notification' in window) || Notification.permission !== 'default';
    }
  }

  // ---------- Desenho das listas ----------
  function linhaPedido(p, { selecionavel = false, dentro = false } = {}) {
    const eu = AUTH()?.usuario?.usuario;
    const meu = !eu || p.usuario === eu;
    const meta = [`${p.qtd} × ${esc(p.conteudo)}`, `pedido por ${esc(p.nome)}`, esc(p.criadoEm)].join(' · ');
    let estado = '';
    if (p.situacao === 'INCLUÍDO') estado = `<span class="perm-chip ok">Incluído na minuta nº ${esc(p.minuta)}</span>`;
    else if (p.situacao === 'RECUSADO') estado = `<span class="perm-chip off">Recusado${p.motivo ? ': ' + esc(p.motivo) : ''}</span>`;
    else if (p.situacao === 'CANCELADO') estado = '<span class="perm-chip">Cancelado</span>';
    else if (dentro) estado = '<span class="perm-chip all">Na minuta aberta</span>';
    else if (!podeAtender) estado = '<span class="perm-chip wait">Aguardando o malote</span>';
    const acoes = p.situacao !== 'AGUARDANDO' ? (podeExcluir && descartavel(p) ? `<button type="button" class="del" data-ped-excluir="${esc(p.id)}" title="Excluir o pedido">${ico('trash')}<span>Excluir</span></button>` : '') : (podeAtender && !meu)
      ? `<button type="button" class="del" data-ped-recusar="${esc(p.id)}" title="Recusar o pedido">${ico('close')}<span>Recusar</span></button>`
      : meu ? `<button type="button" class="del" data-ped-cancelar="${esc(p.id)}" title="Cancelar o pedido">${ico('close')}<span>Cancelar</span></button>` : '';
    const caixa = selecionavel ? `<input type="checkbox" class="ped-check" data-ped-sel="${esc(p.id)}" ${dentro ? 'disabled' : ''} aria-label="Incluir ${esc(resumo(p))}" />` : '';
    return `<div class="ped-item${dentro ? ' dentro' : ''}${p.situacao !== 'AGUARDANDO' ? ' feito' : ''}" ${selecionavel && !dentro ? `data-ped-linha="${esc(p.id)}"` : ''}>
      ${caixa}
      <div class="ped-main">
        <div class="ped-rota"><b>${esc(p.de)}</b><span aria-hidden="true">→</span><b>${esc(p.para)}</b></div>
        <small>${meta}</small>
        ${p.obs ? `<div class="det-obs">${esc(p.obs)}</div>` : ''}
        ${estado ? `<div class="ped-estado">${estado}</div>` : ''}
      </div>
      <div class="act ped-acoes">${acoes}</div>
    </div>`;
  }

  function render() {
    const fila = aguardando(), dentro = naMinuta();
    const feitos = pedidos.filter((p) => p.situacao !== 'AGUARDANDO');
    $('pedListaTitulo').textContent = podeAtender ? 'Aguardando inclusão' : 'Meus pedidos aguardando';
    $('pedContador').textContent = String(fila.length);
    $('pedIncluir').hidden = !podeAtender;
    $('pedAguardando').innerHTML = fila.length
      ? fila.map((p) => linhaPedido(p, { selecionavel: podeAtender, dentro: dentro.has(p.id) })).join('')
      : `<div class="us-empty">${podeAtender ? 'Nenhum pedido aguardando. Quando alguém pedir um envio, ele aparece aqui.' : 'Você não tem pedidos aguardando. Use o formulário para pedir um envio.'}</div>`;
    const lixo = feitos.filter(descartavel).length;
    $('pedLimpar').hidden = !podeExcluir || lixo < 2;
    $('pedLimpar').querySelector('span').textContent = `Excluir recusados e cancelados (${lixo})`;
    $('pedHistorico').innerHTML = feitos.length ? feitos.map((p) => linhaPedido(p)).join('') : '<div class="us-empty">Nenhum pedido atendido ainda.</div>';
    atualizarBotaoIncluir();
  }

  function renderModal() {
    const fila = aguardando(), dentro = naMinuta();
    const fora = fila.filter((p) => !dentro.has(p.id));
    $('pedModalSub').textContent = `Marque os que vão no malote da minuta nº ${window.MINUTA?.numero?.() || ''}.`;
    $('pedModalLista').innerHTML = fila.length
      ? fila.map((p) => linhaPedido(p, { selecionavel: true, dentro: dentro.has(p.id) })).join('')
      : '<div class="us-empty">Nenhum pedido aguardando.</div>';
    $('pedModalTodos').hidden = fora.length < 2;
    atualizarBotaoIncluir();
  }

  const marcados = (box) => [...box.querySelectorAll('[data-ped-sel]:checked')].map((c) => c.dataset.pedSel);
  function atualizarBotaoIncluir() {
    const nv = marcados($('pedAguardando')).length, nm = marcados($('pedModalLista')).length;
    $('pedIncluir').disabled = !nv; $('pedIncluir').querySelector('span').textContent = nv ? `Incluir na minuta (${nv})` : 'Incluir na minuta';
    $('pedModalIncluir').disabled = !nm; $('pedModalIncluir').textContent = nm ? `Incluir no malote (${nm})` : 'Incluir no malote';
  }

  // ---------- Ações ----------
  function incluir(ids) {
    if (!window.MINUTA) return window.toast?.('Abra a tela da minuta para incluir pedidos.', true);
    const dentro = naMinuta();
    const lista = aguardando().filter((p) => ids.includes(p.id) && !dentro.has(p.id));
    if (!lista.length) return;
    window.MINUTA.adicionarItens(lista.map((p) => ({
      pessoa: p.de, ref: p.para, qtd: p.qtd, conteudo: CONTEUDOS.includes(p.conteudo) ? p.conteudo : 'Outros', obs: p.obs || '', pedidoId: p.id,
    })));
    window.fecharModal?.($('mPedidos'));
    if (document.body.dataset.screen !== 'nova') window.go?.('nova');
    atualizarAvisos();
    window.toast?.(`${lista.length === 1 ? '1 pedido incluído' : lista.length + ' pedidos incluídos'} na minuta nº ${window.MINUTA.numero()}. Ao gerar o PDF ou registrar, ${lista.length === 1 ? 'ele fica marcado' : 'eles ficam marcados'} como incluído${lista.length === 1 ? '' : 's'}.`);
  }

  function abrirModal() {
    renderModal();
    window.abrirModal?.($('mPedidos'));
    carregar();
  }

  async function enviarPedido() {
    const pedido = { de: $('pedDe').value.trim(), para: $('pedPara').value.trim(), qtd: Number($('pedQtd').value) || 1, conteudo: $('pedConteudo').value, obs: $('pedObs').value.trim() };
    if (!pedido.de) { window.toast?.('Informe quem está enviando.', true); return $('pedDe').focus(); }
    if (!pedido.para) { window.toast?.('Informe para quem vai o envio.', true); return $('pedPara').focus(); }
    const b = $('pedEnviar'); b.disabled = true;
    const r = await api.auth('pedidos.criar', { pedido });
    b.disabled = false;
    if (!r?.ok) return window.toast?.(r?.error || 'Não foi possível enviar o pedido.', true);
    pedidos.unshift(r.pedido); situacaoAnterior.set(r.pedido.id, 'AGUARDANDO'); conhecidos.add(r.pedido.id);
    $('pedPara').value = ''; $('pedQtd').value = 1; $('pedObs').value = ''; $('pedConteudo').value = 'Envelope';
    render(); atualizarAvisos();
    window.toast?.(`Pedido enviado: ${resumo(r.pedido)}. Quem monta o malote já foi avisado.`);
    $('pedPara').focus();
  }

  async function excluir(ids) {
    const lista = pedidos.filter((p) => ids.includes(p.id) && descartavel(p));
    if (!lista.length) return;
    const um = lista.length === 1;
    const ok = await window.confirmarAcaoCorporativa?.({
      titulo: um ? 'Excluir pedido' : 'Excluir pedidos',
      mensagem: um ? `Excluir o pedido ${esc(resumo(lista[0]))} (${lista[0].situacao.toLowerCase()})?` : `Excluir ${lista.length} pedidos recusados ou cancelados?`,
      detalhe: 'Eles saem da lista e da aba Pedidos da planilha. Não dá para desfazer.',
      confirmacao: um ? 'Excluir pedido' : `Excluir ${lista.length} pedidos`, tipo: 'danger',
    });
    if (!ok) return;
    const r = await api.auth('pedidos.excluir', { ids: lista.map((p) => p.id) });
    if (!r?.ok) return window.toast?.(r?.error || 'Não foi possível excluir.', true);
    pedidos = pedidos.filter((p) => !lista.some((x) => x.id === p.id));
    render();
    window.toast?.(r.excluidos === 1 ? 'Pedido excluído.' : `${r.excluidos} pedidos excluídos.`);
  }

  let recusando = null;
  async function cancelar(id) {
    const p = pedidos.find((x) => x.id === id); if (!p) return;
    const ok = await window.confirmarAcaoCorporativa?.({ titulo: 'Cancelar pedido', mensagem: `Cancelar o pedido ${esc(resumo(p))}?`, detalhe: 'Ele sai da lista de quem monta o malote.', confirmacao: 'Cancelar pedido', tipo: 'danger' });
    if (!ok) return;
    const r = await api.auth('pedidos.cancelar', { id });
    if (!r?.ok) return window.toast?.(r?.error || 'Não foi possível cancelar o pedido.', true);
    window.toast?.('Pedido cancelado.'); carregar();
  }
  function abrirRecusa(id) {
    const p = pedidos.find((x) => x.id === id); if (!p) return;
    recusando = p;
    $('pedRecResumo').innerHTML = `<b>${esc(resumo(p))}</b><br><small>${p.qtd} × ${esc(p.conteudo)} · pedido por ${esc(p.nome)}</small>`;
    $('pedRecMotivo').value = '';
    window.abrirModal?.($('mPedRecusar'));
    setTimeout(() => $('pedRecMotivo').focus(), 60);
  }
  $('pedRecConfirmar').addEventListener('click', async () => {
    if (!recusando) return;
    const b = $('pedRecConfirmar'); b.disabled = true;
    const r = await api.auth('pedidos.cancelar', { id: recusando.id, motivo: $('pedRecMotivo').value.trim() });
    b.disabled = false;
    if (!r?.ok) return window.toast?.(r?.error || 'Não foi possível recusar o pedido.', true);
    window.fecharModal?.($('mPedRecusar')); recusando = null;
    window.toast?.('Pedido recusado. Quem pediu vai ver o motivo.'); carregar();
  });

  // Cliques nas listas (tela e janela usam o mesmo desenho).
  function ligarLista(box) {
    box.addEventListener('click', (e) => {
      const x = e.target.closest('[data-ped-excluir]');
      if (x) return excluir([x.dataset.pedExcluir]);
      const c = e.target.closest('[data-ped-cancelar]'), r = e.target.closest('[data-ped-recusar]');
      if (c) return cancelar(c.dataset.pedCancelar);
      if (r) return abrirRecusa(r.dataset.pedRecusar);
      const linha = e.target.closest('[data-ped-linha]');
      if (linha && !e.target.closest('input,button')) { const cb = linha.querySelector('[data-ped-sel]'); cb.checked = !cb.checked; }
      atualizarBotaoIncluir();
    });
    box.addEventListener('change', atualizarBotaoIncluir);
  }
  ligarLista($('pedAguardando')); ligarLista($('pedModalLista')); ligarLista($('pedHistorico'));
  $('pedIncluir').addEventListener('click', () => incluir(marcados($('pedAguardando'))));
  $('pedModalIncluir').addEventListener('click', () => incluir(marcados($('pedModalLista'))));
  $('pedModalTodos').addEventListener('click', () => { $('pedModalLista').querySelectorAll('[data-ped-sel]:not(:disabled)').forEach((c) => (c.checked = true)); atualizarBotaoIncluir(); });
  $('pedBannerVer').addEventListener('click', abrirModal);
  $('pedBannerAvisos').addEventListener('click', async () => { try { await Notification.requestPermission(); } catch {} atualizarAvisos(); });
  $('pedEnviar').addEventListener('click', enviarPedido);
  $('pedNovoCard').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); enviarPedido(); } });
  $('pedLimpar').addEventListener('click', () => excluir(pedidos.filter(descartavel).map((p) => p.id)));
  $('pedAtualizar').addEventListener('click', () => carregar({ silencioso: false }));

  // ---------- Ciclo ----------
  window.addEventListener('gm-entrou', () => { entrou = true; setTimeout(() => carregar({ silencioso: true }), 2500); });
  window.addEventListener('gm-minuta-registrada', () => setTimeout(() => carregar(), 1200));
  window.addEventListener('focus', () => carregar());
  let ultimo = 0;
  setInterval(() => {
    // A cada minuto com o app na tela; a cada 3 minutos com ele minimizado.
    const intervalo = document.hidden ? 180000 : 60000;
    if (Date.now() - ultimo >= intervalo) { ultimo = Date.now(); carregar(); }
  }, 15000);
  // A faixa da Nova minuta some quando o pedido entra na minuta aberta (ou volta se o item for apagado).
  new MutationObserver(() => atualizarAvisos()).observe(document.getElementById('itensBody') || document.body, { childList: true });

  window.PEDIDOS = { render: () => { render(); carregar({ silencioso: false }); }, carregar, abrir: abrirModal };
})();
