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
    '<button class="nav" data-go="pedidos" data-ico="inbox"><span>Envio</span><kbd>Alt 4</kbd><b class="nav-badge" id="pedBadge" hidden></b></button>');

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
        <div class="vh-title"><div><span class="eyebrow">Operação</span><h2>Envio</h2></div></div>
        <div class="vh-actions"><button class="ghost" id="pedAtualizar" type="button" data-ico="refresh"><span>Atualizar</span></button></div>
      </header>
      <div class="ped-grid">
        <section class="card" id="pedNovoCard">
          <div class="card-h"><h3 data-ico="send">Novo pedido</h3></div>
          <p class="hint ped-hint">Diga de quem para quem vai o envio. Quem monta o malote recebe o aviso e inclui o seu pedido.</p>
          <div class="ped-email" id="pedEmailAviso" hidden><span data-ico="mail"></span><span id="pedEmailTxt"></span> <button class="lg-link ped-email-btn" id="pedEmailBtn" type="button"></button></div>
          <div class="fgrid">
            <label class="field span2"><span>Quem está enviando</span><input id="pedDe" list="pessoasList" maxlength="80" autocomplete="off" title="Nome e setor de quem está mandando o envio (ex.: Mariana - Expedição). Comece a digitar para ver os nomes já usados." /></label>
            <label class="field span2"><span>Para quem vai</span><input id="pedPara" list="destinosList" maxlength="80" autocomplete="off" title="Nome e setor de quem vai receber (ex.: Sheila - Recepção). Comece a digitar para ver os nomes já usados." /></label>
            <label class="field"><span>Quantidade</span><input id="pedQtd" type="number" min="1" max="999" value="1" title="Quantos volumes ou itens vão neste envio (de 1 a 999)" /></label>
            <label class="field"><span>Conteúdo</span><select id="pedConteudo" title="Tipo do que vai ser enviado: envelope, pacote, caixa ou outros">${CONTEUDOS.map((c) => `<option>${c}</option>`).join('')}</select></label>
            <label class="field span2"><span>Observação <i>(opcional)</i></span><textarea id="pedObs" rows="2" maxlength="200" title="Informação extra para quem monta o malote, como: entregar em mãos, frágil ou urgente. Opcional."></textarea></label>
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
        <label class="field"><span>Motivo <i>(a pessoa que pediu vai ver)</i></span><textarea id="pedRecMotivo" rows="3" maxlength="200" title="Explique por que o pedido foi recusado, como: vai pelo correio ou já foi enviado. A pessoa que pediu vai ver este texto."></textarea></label>
      </div>
      <div class="m-foot"><button class="ghost" data-close type="button">Voltar</button><button class="danger-primary" id="pedRecConfirmar" type="button">Recusar pedido</button></div>
    </div></div>
    <div class="modal" id="mPedReabrir" aria-hidden="true"><div class="mbox sm-box" role="dialog" aria-modal="true" aria-labelledby="pedReaTitulo">
      <div class="m-head"><h3 id="pedReaTitulo">Reabrir pedido</h3><button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button></div>
      <div class="m-body">
        <p id="pedReaResumo"></p>
        <p class="hint">O pedido volta para a fila de <b>aguardando</b> e entra num próximo malote. <span id="pedReaAviso"></span></p>
        <label class="field"><span>Observação <i>(opcional, fica na conversa do pedido)</i></span><textarea id="pedReaNota" rows="3" maxlength="300" title="Por exemplo: vai no malote de segunda-feira. Quem pediu vê este texto."></textarea></label>
      </div>
      <div class="m-foot"><button class="ghost" data-close type="button">Voltar</button><button class="primary" id="pedReaConfirmar" type="button" data-ico="refresh"><span>Reabrir pedido</span></button></div>
    </div></div>
    <div class="notif-painel" id="notifPainel" hidden role="dialog" aria-label="Notificações">
      <div class="notif-head"><b>Notificações</b><button class="lg-link" id="notifLerTodas" type="button">Marcar todas como lidas</button></div>
      <div class="notif-lista" id="notifLista"></div>
    </div>
    <div class="modal" id="mPedComent" aria-hidden="true"><div class="mbox ped-com-box" role="dialog" aria-modal="true" aria-labelledby="pedComTitulo">
      <div class="m-head">
        <div class="m-title"><span class="m-badge" data-ico="chat"></span><div><h3 id="pedComTitulo">Comentários do pedido</h3><p id="pedComSub"></p></div></div>
        <button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button>
      </div>
      <div class="m-body ped-com-body">
        <div class="ped-com-resumo" id="pedComResumo"></div>
        <div class="ped-com-lista" id="pedComLista" aria-live="polite"></div>
      </div>
      <div class="ped-com-escrever">
        <textarea id="pedComTexto" rows="2" maxlength="500" title="Escreva uma mensagem para quem pediu ou para quem monta o malote. Ctrl+Enter envia."></textarea>
        <button class="primary" id="pedComEnviar" type="button" data-ico="send"><span>Enviar</span></button>
      </div>
      <p class="hint ped-com-nota" id="pedComNota"></p>
    </div></div>`);
  window.hidratarIcones?.();

  // As janelas novas fecham pelo X, pelo fundo e pelo Esc como as outras.
  // Sino de notificações: fica no topo da tela aberta, junto dos botões do cabeçalho.
  const sino = document.createElement('button');
  sino.type = 'button'; sino.id = 'notifBtn'; sino.className = 'ghost notif-btn'; sino.hidden = true;
  sino.title = 'Notificações dos comentários'; sino.setAttribute('aria-label', 'Notificações');
  sino.innerHTML = `${ico('bell')}<b class="notif-badge" id="notifBadge" hidden></b>`;

  ['mPedidos', 'mPedRecusar', 'mPedReabrir', 'mPedComent'].forEach((id) => {
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

  // ---------- Comentários: o que cada um já leu fica guardado neste aparelho ----------
  const K_VISTOS = 'gm_ped_coment_vistos_v1';
  let vistos = {};
  try { vistos = JSON.parse(localStorage.getItem(K_VISTOS) || '{}') || {}; } catch { vistos = {}; }
  const guardarVistos = () => { try { localStorage.setItem(K_VISTOS, JSON.stringify(vistos)); } catch {} };
  const comentariosDe = (p) => (Array.isArray(p.comentarios) ? p.comentarios : []);
  const naoLidos = (p) => {
    const eu = AUTH()?.usuario?.usuario;
    return comentariosDe(p).slice(vistos[p.id] || 0).filter((c) => c.usuario !== eu).length;
  };
  const marcarLido = (p) => { vistos[p.id] = comentariosDe(p).length; guardarVistos(); atualizarSino(); };
  const totaisComentarios = new Map(); // para avisar comentário novo entre uma atualização e outra
  let comentandoId = null;

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
      atualizarSino();
      if (document.body.dataset.screen === 'pedidos') render();
      if ($('mPedidos').classList.contains('open')) renderModal();
      if (comentandoId && $('mPedComent').classList.contains('open')) renderComentarios();
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
    // Comentário novo de outra pessoa.
    pedidos.forEach((p) => {
      const lista = comentariosDe(p), antes = totaisComentarios.get(p.id);
      if (!primeiraCarga && antes != null && lista.length > antes) {
        const ultimo = lista[lista.length - 1];
        if (ultimo.usuario !== eu && comentandoId !== p.id) {
          const reab = /^↺/.test(ultimo.texto);
          const t = reab ? `${ultimo.nome} reabriu o pedido ${resumo(p)}: ele voltou para a fila de envio.`
            : `${ultimo.nome} comentou no pedido ${resumo(p)}: ${ultimo.texto.length > 80 ? ultimo.texto.slice(0, 80) + '…' : ultimo.texto}`;
          window.toast?.(t); avisoDoSistema(reab ? 'Pedido reaberto' : 'Comentário no pedido', t);
        }
      }
      totaisComentarios.set(p.id, lista.length);
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
    const reabrivel = descartavel(p) && (podeAtender || (meu && p.situacao === 'CANCELADO'));
    const botaoReabrir = reabrivel ? `<button type="button" class="ped-reabrir" data-ped-reabrir="${esc(p.id)}" title="Voltar o pedido para a fila, para um envio posterior">${ico('refresh')}<span>Reabrir</span></button>` : '';
    const acoes = p.situacao !== 'AGUARDANDO' ? botaoReabrir + (podeExcluir && descartavel(p) ? `<button type="button" class="del" data-ped-excluir="${esc(p.id)}" title="Excluir o pedido">${ico('trash')}<span>Excluir</span></button>` : '') : (podeAtender && !meu)
      ? `<button type="button" class="del" data-ped-recusar="${esc(p.id)}" title="Recusar o pedido">${ico('close')}<span>Recusar</span></button>`
      : meu ? `<button type="button" class="del" data-ped-cancelar="${esc(p.id)}" title="Cancelar o pedido">${ico('close')}<span>Cancelar</span></button>` : '';
    const nCom = comentariosDe(p).length, novos = naoLidos(p);
    const botaoCom = `<button type="button" class="ped-com-btn${novos ? ' novo' : ''}" data-ped-coment="${esc(p.id)}" title="${novos ? novos + (novos === 1 ? ' comentário novo' : ' comentários novos') : 'Comentários do pedido'}">${ico('chat')}<span>${nCom ? nCom : 'Comentar'}</span>${novos ? '<i class="ped-dot" aria-hidden="true"></i>' : ''}</button>`;
    const caixa = selecionavel ? `<input type="checkbox" class="ped-check" data-ped-sel="${esc(p.id)}" ${dentro ? 'disabled' : ''} aria-label="Incluir ${esc(resumo(p))}" />` : '';
    return `<div class="ped-item${dentro ? ' dentro' : ''}${p.situacao !== 'AGUARDANDO' ? ' feito' : ''}" ${selecionavel && !dentro ? `data-ped-linha="${esc(p.id)}"` : ''}>
      ${caixa}
      <div class="ped-main">
        <div class="ped-rota"><b>${esc(p.de)}</b><span aria-hidden="true">→</span><b>${esc(p.para)}</b></div>
        <small>${meta}</small>
        ${p.obs ? `<div class="det-obs">${esc(p.obs)}</div>` : ''}
        ${estado ? `<div class="ped-estado">${estado}</div>` : ''}
      </div>
      <div class="act ped-acoes">${botaoCom}${acoes}</div>
    </div>`;
  }

  // Aviso por e-mail: mostra para onde vai o aviso, ou convida a cadastrar o e-mail.
  function renderEmail() {
    const u = window.AUTH?.usuario, box = $('pedEmailAviso');
    if (!box) return;
    if (!u || window.AUTH?.legado || !pode('pedidos.criar')) { box.hidden = true; return; }
    box.hidden = false;
    box.classList.toggle('sem', !u.email);
    $('pedEmailTxt').textContent = u.email
      ? 'Quando o pedido for incluído na minuta, recusado, reaberto ou comentado, a Expedição confere e envia o aviso para ' + u.email + ' (se você estiver no cadastro de destinatários).'
      : 'Cadastre o seu e-mail para que a Expedição possa incluir você no cadastro de destinatários e mandar os avisos dos seus pedidos.';
    $('pedEmailBtn').textContent = u.email ? 'Alterar' : 'Cadastrar e-mail';
  }
  $('pedEmailBtn')?.addEventListener('click', () => { $('sbUser')?.click(); setTimeout(() => $('contaEmail')?.focus(), 120); });
  window.addEventListener('gm-usuario-atualizado', renderEmail);

  function render() {
    renderEmail();
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
    window.EMAILS?.conferir(r.emailsPendentes); // confira o e-mail e marque quem recebe antes de enviar
  });

  // ---------- Reabrir pedido (recusado ou cancelado volta para a fila) ----------
  let reabrindo = null;
  function abrirReabrir(id) {
    const p = pedidos.find((x) => x.id === id); if (!p) return;
    reabrindo = p;
    const eu = AUTH()?.usuario?.usuario;
    $('pedReaResumo').innerHTML = `<b>${esc(resumo(p))}</b><br><small>${p.qtd} × ${esc(p.conteudo)} · pedido por ${esc(p.nome)} · ${p.situacao === 'RECUSADO' ? 'recusado' + (p.motivo ? ': ' + esc(p.motivo) : '') : 'cancelado'}</small>`;
    $('pedReaAviso').textContent = p.usuario === eu ? '' : `${p.nome} recebe um aviso no app. O e-mail você confere e envia em seguida.`;
    $('pedReaNota').value = '';
    window.abrirModal?.($('mPedReabrir'));
    setTimeout(() => $('pedReaNota').focus(), 60);
  }
  $('pedReaConfirmar').addEventListener('click', async () => {
    if (!reabrindo) return;
    const b = $('pedReaConfirmar'); b.disabled = true;
    const r = await api.auth('pedidos.reabrir', { id: reabrindo.id, nota: $('pedReaNota').value.trim() });
    b.disabled = false;
    if (!r?.ok) return window.toast?.(/minuta inválido|desconhecida/i.test(r?.error || '') ? 'Reabrir pedidos precisa da versão 3.0 do script do Google.' : (r?.error || 'Não foi possível reabrir o pedido.'), true);
    const i = pedidos.findIndex((x) => x.id === reabrindo.id);
    if (i >= 0) pedidos[i] = r.pedido;
    vistos[r.pedido.id] = comentariosDe(r.pedido).length; guardarVistos(); // o registro de reabertura é seu: já conta como lido
    totaisComentarios.set(r.pedido.id, comentariosDe(r.pedido).length);
    situacaoAnterior.set(r.pedido.id, 'AGUARDANDO'); conhecidos.add(r.pedido.id);
    window.fecharModal?.($('mPedReabrir')); reabrindo = null;
    render(); atualizarAvisos(); atualizarSino();
    window.toast?.(`Pedido ${resumo(r.pedido)} voltou para a fila.`);
    window.EMAILS?.conferir(r.emailsPendentes);
  });

  // ---------- Central de notificações (comentários) ----------
  const paraData = (t) => { const m = String(t || '').match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)(?::(\d+))?/); return m ? new Date(+m[3], m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)).getTime() : 0; };
  function notificacoes() {
    const eu = AUTH()?.usuario?.usuario;
    const lista = [];
    pedidos.forEach((p) => comentariosDe(p).forEach((c, i) => {
      if (c.usuario === eu) return;
      lista.push({ p, c, lido: i < (vistos[p.id] || 0), quando: paraData(c.data) });
    }));
    return lista.sort((a, b) => b.quando - a.quando).slice(0, 40);
  }
  function posicionarSino() {
    const view = document.getElementById('v-' + (document.body.dataset.screen || ''));
    const acts = view?.querySelector('.vh-actions');
    if (acts && sino.parentNode !== acts) acts.prepend(sino);
    sino.hidden = !usaPedidos() || !acts;
    if (sino.hidden) fecharPainel();
  }
  function atualizarSino() {
    posicionarSino();
    const n = notificacoes().filter((x) => !x.lido).length;
    const badge = $('notifBadge');
    badge.hidden = !n; badge.textContent = n > 9 ? '9+' : String(n);
    sino.classList.toggle('tem', !!n);
    sino.title = n ? `${n} ${n === 1 ? 'comentário novo' : 'comentários novos'}` : 'Notificações dos comentários';
    if (!$('notifPainel').hidden) renderPainel();
  }
  function renderPainel() {
    const lista = notificacoes();
    $('notifLerTodas').hidden = !lista.some((x) => !x.lido);
    $('notifLista').innerHTML = lista.length ? lista.map((x) => {
      const reab = /^↺/.test(x.c.texto);
      const txt = x.c.texto.replace(/^↺\s*/, '');
      return `<button type="button" class="notif-item${x.lido ? '' : ' novo'}" data-notif-ped="${esc(x.p.id)}">
        <span class="notif-ico${reab ? ' reab' : ''}">${ico(reab ? 'refresh' : 'chat')}</span>
        <span class="notif-txt"><span><b>${esc(x.c.nome)}</b> ${reab ? 'reabriu' : 'comentou em'} <b>${esc(resumo(x.p))}</b></span>
        <small>${esc(txt.length > 110 ? txt.slice(0, 110) + '…' : txt)}</small><em>${esc(x.c.data)}</em></span>
        ${x.lido ? '' : '<i class="ped-dot" aria-hidden="true"></i>'}</button>`;
    }).join('') : '<div class="notif-vazio">Nenhum comentário por aqui ainda. Quando alguém comentar num pedido seu (ou num pedido que você atende), aparece aqui.</div>';
  }
  function abrirPainel() {
    const painel = $('notifPainel');
    renderPainel();
    painel.hidden = false;
    const r = sino.getBoundingClientRect();
    const larg = Math.min(380, window.innerWidth - 16);
    painel.style.width = larg + 'px';
    painel.style.top = Math.round(r.bottom + 8) + 'px';
    painel.style.left = Math.round(Math.max(8, Math.min(window.innerWidth - larg - 8, r.right - larg))) + 'px';
    sino.setAttribute('aria-expanded', 'true');
  }
  function fecharPainel() { const pn = $('notifPainel'); if (pn && !pn.hidden) { pn.hidden = true; sino.setAttribute('aria-expanded', 'false'); } }
  sino.addEventListener('click', (e) => { e.stopPropagation(); if ($('notifPainel').hidden) { carregar(); abrirPainel(); } else fecharPainel(); });
  $('notifPainel').addEventListener('click', (e) => {
    e.stopPropagation();
    const it = e.target.closest('[data-notif-ped]');
    if (it) { fecharPainel(); abrirComentarios(it.dataset.notifPed); }
  });
  $('notifLerTodas').addEventListener('click', () => { pedidos.forEach((p) => { vistos[p.id] = comentariosDe(p).length; }); guardarVistos(); atualizarSino(); render(); });
  document.addEventListener('click', fecharPainel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharPainel(); }, true);
  window.addEventListener('resize', fecharPainel);
  new MutationObserver(posicionarSino).observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });

  // ---------- Comentários ----------
  function renderComentarios() {
    const p = pedidos.find((x) => x.id === comentandoId);
    if (!p) { window.fecharModal?.($('mPedComent')); comentandoId = null; return; }
    const eu = AUTH()?.usuario?.usuario;
    const lista = comentariosDe(p);
    const situacao = { 'INCLUÍDO': `Incluído na minuta nº ${p.minuta}`, RECUSADO: 'Recusado', CANCELADO: 'Cancelado', AGUARDANDO: 'Aguardando o malote' }[p.situacao] || p.situacao;
    $('pedComSub').textContent = `${resumo(p)} · ${situacao}`;
    $('pedComResumo').innerHTML = `<b>${esc(p.qtd)} × ${esc(p.conteudo)}</b> · pedido por ${esc(p.nome)} em ${esc(p.criadoEm)}${p.obs ? `<div class="det-obs">${esc(p.obs)}</div>` : ''}`;
    const box = $('pedComLista');
    const noFim = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    box.innerHTML = lista.length
      ? lista.map((c) => `<div class="ped-com${c.usuario === eu ? ' meu' : ''}${/^↺/.test(c.texto) ? ' reab' : ''}"><div class="ped-com-meta"><b>${esc(c.usuario === eu ? 'Você' : c.nome)}</b><span>${esc(c.data)}</span></div><div class="ped-com-txt">${esc(c.texto).replace(/\n/g, '<br>')}</div></div>`).join('')
      : '<div class="us-empty">Nenhum comentário ainda. Escreva abaixo para conversar sobre este pedido.</div>';
    if (noFim || !box.dataset.aberto) { box.scrollTop = box.scrollHeight; box.dataset.aberto = '1'; }
    const meu = !eu || p.usuario === eu;
    $('pedComNota').textContent = (meu ? 'Quem monta o malote recebe um aviso no app.' : `${p.nome} recebe um aviso no app.`) + ' Se quiser mandar e-mail, você confere a mensagem e escolhe quem recebe logo depois de enviar.';
    marcarLido(p);
  }
  function abrirComentarios(id) {
    comentandoId = id;
    $('pedComLista').dataset.aberto = '';
    $('pedComTexto').value = '';
    renderComentarios();
    window.abrirModal?.($('mPedComent'));
    setTimeout(() => $('pedComTexto').focus(), 60);
    render(); if ($('mPedidos').classList.contains('open')) renderModal();
  }
  async function enviarComentario() {
    const texto = $('pedComTexto').value.trim();
    if (!texto) { $('pedComTexto').focus(); return window.toast?.('Escreva o comentário.', true); }
    const b = $('pedComEnviar'); b.disabled = true;
    const r = await api.auth('pedidos.comentar', { id: comentandoId, texto });
    b.disabled = false;
    if (!r?.ok) return window.toast?.(/minuta inválido|desconhecida/i.test(r?.error || '') ? 'Os comentários precisam da versão 2.9 do script do Google.' : (r?.error || 'Não foi possível enviar o comentário.'), true);
    const p = pedidos.find((x) => x.id === comentandoId);
    if (p) { p.comentarios = r.comentarios || [...comentariosDe(p), r.comentario]; totaisComentarios.set(p.id, p.comentarios.length); }
    $('pedComTexto').value = '';
    $('pedComLista').dataset.aberto = '';
    renderComentarios(); render();
    $('pedComTexto').focus();
    window.EMAILS?.conferir(r.emailsPendentes);
  }
  $('pedComEnviar').addEventListener('click', enviarComentario);
  $('pedComTexto').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); enviarComentario(); } });
  new MutationObserver(() => { if (!$('mPedComent').classList.contains('open') && comentandoId) { comentandoId = null; render(); } })
    .observe($('mPedComent'), { attributes: true, attributeFilter: ['class'] });

  // Cliques nas listas (tela e janela usam o mesmo desenho).
  function ligarLista(box) {
    box.addEventListener('click', (e) => {
      const ra = e.target.closest('[data-ped-reabrir]');
      if (ra) return abrirReabrir(ra.dataset.pedReabrir);
      const cm = e.target.closest('[data-ped-coment]');
      if (cm) return abrirComentarios(cm.dataset.pedComent);
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
  window.addEventListener('gm-entrou', () => { entrou = true; posicionarSino(); setTimeout(() => carregar({ silencioso: true }), 2500); });
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
