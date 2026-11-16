/* =========================================================
   GERADOR DE MINUTAS · DESTINATÁRIOS E E-MAILS CONFERIDOS (v3.2)
   - Quem fez o pedido recebe os avisos automático (o script do Google envia).
   - Qualquer outro destinatário (gestor etc.) só recebe depois de conferido:
     o script guarda o aviso como PENDENTE e aqui ele é conferido.
     "Agora não" deixa a pendência no sino de notificações.
   - Janela "Conferir e-mail": prévia da mensagem de verdade e a lista
     de destinatários cadastrados para marcar (não há caixa para digitar
     endereço). Só sai quando alguém clica em Enviar.
   - Tela "Destinatários": cadastro de quem pode receber e-mail e a fila
     de e-mails para conferir (com os enviados e descartados recentes).
========================================================= */
(function () {
  const api = window.api;
  if (!api || !api.auth) return;
  const $ = (id) => document.getElementById(id);
  const ico = window.ICO || (() => '');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.toast?.(m, e);
  const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || '?';
  const MSG_SCRIPT = 'A conferência de e-mails e o cadastro de destinatários precisam da versão 3.1 do script do Google.';
  const MSG_AUTORIZAR = 'Falta autorizar o envio de e-mail: no Apps Script da planilha, escolha a função testarEmail, clique em Executar e permita "Enviar e-mail como você".';
  const antigo = (r) => /minuta inválido|desconhecida|Ação inválida/i.test(r?.error || '');
  const erroDe = (r, padrao) => {
    const e = r?.error || '';
    if (antigo(r)) return MSG_SCRIPT;
    if (/MailApp|script\.send_mail|permiss[aã]o para chamar/i.test(e)) return MSG_AUTORIZAR;
    return e || padrao;
  };
  const COR_TIPO = { incluido: 'ok', recusado: 'off', reaberto: 'all', comentario: 'all', lembrete: 'wait' };

  // ---------- Marcação ----------
  (document.querySelector('.sb-nav [data-go="pedidos"]') || document.querySelector('.sb-nav [data-go="frete"]'))?.insertAdjacentHTML('afterend',
    '<button class="nav" data-go="destinatarios" data-ico="mail"><span>Destinatários</span><b class="nav-badge" id="dsBadge" hidden></b></button>');

  document.querySelector('main.content')?.insertAdjacentHTML('beforeend', `
    <section id="v-destinatarios" class="view">
      <header class="vh">
        <div class="vh-title"><div><span class="eyebrow">Operação</span><h2>Destinatários de e-mail</h2></div></div>
        <div class="vh-actions"><button class="ghost" id="dsAtualizar" type="button" data-ico="refresh"><span>Atualizar</span></button></div>
      </header>
      <div class="note" id="dsAntigo" data-ico="info" hidden><span>${esc(MSG_SCRIPT)} Publique o GoogleSheets_Script.gs novo (Implantar › Gerenciar implantações › lápis › Nova versão).</span></div>
      <div class="ds-grid">
        <section class="card" id="dsFilaCard">
          <div class="card-h">
            <h3 data-ico="send"><span>E-mails para conferir</span> <span class="section-counter" id="dsFilaCont">0</span></h3>
            <div class="card-actions"><button class="primary" id="dsConferirTodos" type="button" data-ico="eye" hidden><span>Conferir todos</span></button></div>
          </div>
          <p class="hint ds-hint">Quem fez o pedido recebe o aviso automático. Para qualquer outra pessoa (gestor, outro setor) o e-mail fica aqui: confira a mensagem, marque quem recebe e clique em <b>Enviar</b>. Só aparecem para marcar as pessoas do cadastro ao lado.</p>
          <div class="note" id="dsAvisosOff" data-ico="info" hidden><span>Os avisos por e-mail estão desligados no modelo (Usuários › Aviso por e-mail). Enquanto estiverem desligados, nenhum e-mail novo entra aqui.</span></div>
          <div id="dsFila" class="ped-lista"></div>
          <span class="sub-title ped-sub">Enviados (inclusive os automáticos) e descartados recentemente</span>
          <div id="dsRecentes" class="ped-lista"></div>
        </section>
        <section class="card" id="dsCadCard">
          <div class="card-h">
            <h3 data-ico="users"><span>Cadastro de destinatários</span> <span class="section-counter" id="dsCont">0</span></h3>
            <div class="card-actions">
              <button class="ghost" id="dsImportar" type="button" data-ico="listPlus" title="Traz para o cadastro os usuários do Gerador que já têm e-mail"><span>Importar usuários</span></button>
              <button class="primary" id="dsNovo" type="button" data-ico="plus"><span>Novo destinatário</span></button>
            </div>
          </div>
          <p class="hint ds-hint">Quem está aqui pode ser marcado para receber os e-mails do Gerador. Destinatário inativo continua no cadastro, mas não aparece para marcar.</p>
          <div class="ds-toolbar"><label class="search" data-ico="search"><input id="dsBusca" type="search" placeholder="Buscar nome, e-mail ou setor…" autocomplete="off" /></label></div>
          <div id="dsLista" class="ds-lista"></div>
        </section>
      </div>
    </section>`);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" id="mEmConferir" aria-hidden="true"><div class="mbox xl ec-box" role="dialog" aria-modal="true" aria-labelledby="ecTitulo">
      <div class="m-head">
        <div class="m-title"><span class="m-badge" data-ico="mail"></span><div><h3 id="ecTitulo">Conferir e-mail antes de enviar</h3><p id="ecSub"></p></div></div>
        <button class="ghost sm icon-btn" data-close type="button" title="Fechar (o e-mail continua pendente)" data-ico="close"><span class="sr">Fechar</span></button>
      </div>
      <div class="ec-body">
        <aside class="ec-para">
          <div class="ec-para-head"><span class="sub-title">Para quem vai</span><span class="ec-cont" id="ecCont"></span></div>
          <label class="search" data-ico="search"><input id="ecBusca" type="search" placeholder="Filtrar destinatários…" autocomplete="off" /></label>
          <div class="ec-marcar"><button class="lg-link" id="ecTodos" type="button">Marcar todos</button><button class="lg-link" id="ecNenhum" type="button">Desmarcar</button></div>
          <div class="ec-ja" id="ecJa" hidden></div>
          <div id="ecLista" class="ec-lista"></div>
          <div id="ecFaltam" class="ec-faltam"></div>
          <button class="ghost sm ec-novo" id="ecNovoDest" type="button" data-ico="plus"><span>Cadastrar destinatário</span></button>
        </aside>
        <div class="em-preview ec-preview">
          <div class="em-prev-head"><small>Assunto</small><strong id="ecAssunto">—</strong><span class="em-prev-status" id="ecPrevStatus"></span></div>
          <div id="ecFrame" class="ec-frame"></div>
          <p class="hint em-prev-nota" id="ecPrevNota"></p>
        </div>
      </div>
      <div class="m-foot">
        <button class="ghost ec-descartar" id="ecDescartar" type="button" data-ico="trash"><span>Descartar e-mail</span></button>
        <span class="ec-pos" id="ecPos"></span>
        <button class="ghost" id="ecDepois" type="button" title="Fecha sem enviar. O e-mail continua pendente na tela Destinatários.">Agora não</button>
        <button class="primary" id="ecEnviar" type="button" data-ico="send" disabled><span>Enviar</span></button>
      </div>
    </div></div>
    <div class="modal" id="mDsEditar" aria-hidden="true"><div class="mbox sm-box" role="dialog" aria-modal="true" aria-labelledby="dsEdTitulo">
      <div class="m-head"><h3 id="dsEdTitulo">Novo destinatário</h3><button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button></div>
      <div class="m-body">
        <div class="fgrid ds-form">
          <label class="field span2"><span>Nome</span><input id="dsNome" list="pessoasList" maxlength="80" autocomplete="off" title="Nome de quem recebe. Comece a digitar para escolher alguém do cadastro de pessoas e setores." /></label>
          <label class="field span2"><span>E-mail</span><input id="dsEmail" type="email" maxlength="120" autocomplete="off" title="Endereço que recebe os e-mails do Gerador" /></label>
          <label class="field"><span>Setor <i>(opcional)</i></span><input id="dsSetor" maxlength="80" autocomplete="off" /></label>
          <label class="field"><span>Usuário do Gerador <i>(opcional)</i></span><input id="dsUsuario" maxlength="40" autocomplete="off" spellcheck="false" title="Login da pessoa no Gerador. Com ele, a pessoa já vem marcada nos avisos dos pedidos dela." /></label>
          <div class="field span2"><div class="chips-check"><label><input type="checkbox" id="dsAtivo" checked /><span>Ativo (aparece para marcar nos envios)</span></label><label title="Gestor ou alguém que precisa acompanhar: já vem marcado em todo e-mail para conferir, inclusive a cópia dos avisos automáticos"><input type="checkbox" id="dsCopia" /><span>Sempre em cópia</span></label></div></div>
        </div>
        <p class="hint">Com o <b>usuário do Gerador</b> preenchido, a pessoa recebe automático os avisos dos pedidos dela (se não tiver e-mail em Usuários). <b>Sempre em cópia</b>: para gestor ou quem precisa acompanhar. Ele já vem marcado na conferência de cada aviso, sem precisar entrar como pedido de envio.</p>
      </div>
      <div class="m-foot"><button class="ghost" data-close type="button">Cancelar</button><button class="primary" id="dsSalvar" type="button" data-ico="save"><span>Salvar</span></button></div>
    </div></div>`);
  window.hidratarIcones?.();

  ['mEmConferir', 'mDsEditar'].forEach((id) => {
    const m = $(id);
    m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => window.fecharModal?.(m)));
    m.addEventListener('mousedown', (e) => { if (e.target === m) window.fecharModal?.(m); });
  });

  // ---------- Estado ----------
  let fila = [], recentes = [], dests = [], todos = [], podeEditar = false, podeTodos = false, avisosLigados = true;
  let entrou = false, carregando = false, indisponivel = false, primeiraCarga = true;
  const conhecidos = new Set();
  const AUTH = () => window.AUTH;
  const pode = (p) => !!AUTH()?.pode?.(p);
  const eu = () => AUTH()?.usuario?.usuario || 'codigo';
  const naTela = () => document.body.dataset.screen === 'destinatarios';

  // ---------- Carregar ----------
  async function carregarFila({ silencioso = true, abrirNovos = true } = {}) {
    if (!entrou || carregando || indisponivel) return;
    carregando = true;
    try {
      const r = await api.auth('emails.listar');
      if (!r?.ok) {
        if (antigo(r) || r?.codigo === 'semurl' || (r?.versao && parseFloat(r.versao) < 3.1)) { indisponivel = true; $('dsAntigo').hidden = false; atualizarBadge(); }
        else if (!silencioso) toast(erroDe(r, 'Não foi possível carregar os e-mails.'), true);
        return;
      }
      fila = r.pendentes || []; recentes = r.recentes || []; dests = r.destinatarios || [];
      podeEditar = !!r.podeEditar; podeTodos = !!r.podeTodos; avisosLigados = r.avisosLigados !== false;
      const novos = fila.filter((e) => !conhecidos.has(e.id));
      fila.forEach((e) => conhecidos.add(e.id));
      if (!primeiraCarga && abrirNovos) {
        // Avisos gerados pelas minhas ações: abre a conferência na hora.
        const meus = novos.filter((e) => e.geradoPor === eu());
        if (meus.length && !$('mEmConferir').classList.contains('open')) abrirConferencia(meus);
        const outros = novos.filter((e) => e.geradoPor !== eu());
        if (outros.length && podeTodos) toast(outros.length === 1 ? `Novo e-mail para conferir: ${outros[0].resumo}` : `${outros.length} novos e-mails para conferir na tela Destinatários.`);
      } else if (primeiraCarga && podeTodos && fila.length) {
        toast(fila.length === 1 ? 'Há 1 e-mail aguardando conferência na tela Destinatários.' : `Há ${fila.length} e-mails aguardando conferência na tela Destinatários.`);
      }
      primeiraCarga = false;
      atualizarBadge();
      if (naTela()) renderFila();
      if ($('mEmConferir').classList.contains('open')) renderLista();
    } finally { carregando = false; }
  }

  async function carregarCadastro({ silencioso = true } = {}) {
    if (indisponivel) return;
    const r = await api.auth('destinatarios.listar');
    if (!r?.ok) {
      if (antigo(r)) { indisponivel = true; $('dsAntigo').hidden = false; }
      else if (!silencioso) toast(erroDe(r, 'Não foi possível carregar o cadastro.'), true);
      return;
    }
    todos = r.destinatarios || []; podeEditar = !!r.podeEditar;
    dests = todos.filter((d) => d.ativo);
    if (naTela()) renderCadastro();
  }

  function atualizarBadge() {
    window.dispatchEvent(new Event('gm-emails-atualizados'));
    const b = $('dsBadge');
    if (!b) return;
    const n = indisponivel ? 0 : fila.length;
    b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n || '');
  }

  // ---------- Tela: fila de e-mails ----------
  const resumoPedidos = (e) => {
    const p = e.pedidos || [];
    if (!p.length) return esc(e.resumo);
    return `<b>${esc(p[0].de)}</b><span aria-hidden="true">→</span><b>${esc(p[0].para)}</b>${p.length > 1 ? ` <small>e mais ${p.length - 1}</small>` : ''}`;
  };
  const nomesSugeridos = (e) => [...new Set([...e.sugeridos, ...(e.copias || [])])].map((id) => dests.find((d) => d.id === id)?.nome).filter(Boolean);

  function linhaFila(e) {
    const sug = nomesSugeridos(e);
    const extra = e.extra?.comentario ? `<div class="det-obs">${esc(e.extra.autor)}: ${esc(e.extra.comentario)}</div>`
      : e.extra?.nota ? `<div class="det-obs">${esc(e.extra.nota)}</div>`
      : e.tipo === 'recusado' && e.pedidos[0]?.motivo ? `<div class="det-obs">Motivo: ${esc(e.pedidos[0].motivo)}</div>` : '';
    const para = (e.jaEnviado ? `Já enviado automático para ${esc(e.jaEnviado.replace(/\s*<.*$/, ''))} · ` : '') + (sug.length ? (e.jaEnviado ? 'cópia para ' : 'Sugerido para ') + sug.map(esc).join(', ') : (e.semCadastro.length ? `${esc(e.semCadastro.map((s) => s.nome).join(', '))} não ${e.semCadastro.length === 1 ? 'está' : 'estão'} no cadastro` : 'Escolha os destinatários ao conferir'));
    return `<div class="ped-item">
      <div class="ped-main">
        <div class="ped-estado"><span class="perm-chip ${COR_TIPO[e.tipo] || ''}">${esc(e.nomeTipo)}</span>${e.pedidos[0]?.minuta ? ` <span class="perm-chip">Minuta nº ${esc(e.pedidos[0].minuta)}</span>` : ''}</div>
        <div class="ped-rota">${resumoPedidos(e)}</div>
        <small>Gerado por ${esc(e.geradoPor === eu() ? 'você' : e.nome)} · ${esc(e.criadoEm)} · ${para}</small>
        ${extra}
      </div>
      <div class="act ped-acoes">
        <button type="button" class="ds-conferir" data-em-conferir="${esc(e.id)}">${ico('eye')}<span>Conferir e enviar</span></button>
        <button type="button" class="del" data-em-descartar="${esc(e.id)}" title="Não enviar este e-mail">${ico('trash')}<span>Descartar</span></button>
      </div>
    </div>`;
  }
  function linhaRecente(e) {
    const enviado = e.situacao === 'ENVIADO', auto = e.enviadoPor === 'Automático';
    return `<div class="ped-item feito">
      <div class="ped-main">
        <div class="ped-estado"><span class="perm-chip ${enviado ? 'ok' : ''}">${auto ? 'Automático' : enviado ? 'Enviado' : 'Descartado'}</span> <span class="perm-chip">${esc(e.nomeTipo)}</span></div>
        <div class="ped-rota">${enviado && e.assunto ? `<b>${esc(e.assunto)}</b>` : resumoPedidos(e)}</div>
        <small>${auto ? 'Enviado automaticamente para quem pediu' : (enviado ? 'Enviado' : 'Descartado') + ' por ' + esc(e.enviadoPor)} · ${esc(e.enviadoEm)}</small>
        ${enviado && e.destinatarios ? `<small class="ds-para">Para: ${esc(e.destinatarios)}</small>` : ''}
      </div>
    </div>`;
  }
  function renderFila() {
    $('dsFilaCont').textContent = String(fila.length);
    $('dsAvisosOff').hidden = avisosLigados || indisponivel;
    $('dsConferirTodos').hidden = fila.length < 2;
    $('dsFila').innerHTML = indisponivel ? '' : fila.length ? fila.map(linhaFila).join('')
      : `<div class="us-empty">Nenhum e-mail aguardando. Quando um pedido for incluído, recusado, reaberto ou comentado${podeTodos ? ' (ou houver pedido parado)' : ''}, o e-mail aparece aqui para você conferir.</div>`;
    $('dsRecentes').innerHTML = recentes.length ? recentes.map(linhaRecente).join('') : '<div class="us-empty">Nada enviado ainda.</div>';
  }

  // ---------- Tela: cadastro ----------
  function renderCadastro() {
    const busca = $('dsBusca').value.trim().toLowerCase();
    const lista = todos.filter((d) => !busca || [d.nome, d.email, d.setor, d.usuario].join(' ').toLowerCase().includes(busca));
    $('dsCont').textContent = String(todos.length);
    $('dsNovo').hidden = !podeEditar; $('dsImportar').hidden = !podeEditar;
    $('dsLista').innerHTML = lista.length ? lista.map((d) => `
      <div class="ds-row${d.ativo ? '' : ' off'}">
        <div class="us-who"><span class="avatar">${esc(iniciais(d.nome))}</span><div><strong>${esc(d.nome)}</strong><small>${esc(d.email)}${d.setor ? ' · ' + esc(d.setor) : ''}${d.usuario ? ' · @' + esc(d.usuario) : ''}</small></div></div>
        <span class="ds-chips">${d.copia ? '<span class="perm-chip all">Sempre em cópia</span>' : ''}${d.ativo ? '' : '<span class="perm-chip off">Inativo</span>'}</span>
        ${podeEditar ? `<div class="act"><button type="button" data-ds-editar="${esc(d.id)}" title="Editar">${ico('edit')}<span>Editar</span></button><button type="button" class="del" data-ds-excluir="${esc(d.id)}" title="Excluir">${ico('trash')}<span>Excluir</span></button></div>` : ''}
      </div>`).join('')
      : `<div class="us-empty">${todos.length ? 'Nenhum destinatário encontrado.' : `Nenhum destinatário cadastrado ainda.${podeEditar ? ' Clique em <b>Novo destinatário</b> ou em <b>Importar usuários</b> para trazer quem já tem e-mail no Gerador.' : ' Peça para quem cuida dos cadastros incluir as pessoas.'}`}</div>`;
  }

  function render() {
    renderFila(); renderCadastro();
    carregarCadastro({ silencioso: false }).then(() => carregarFila({ silencioso: false }));
  }

  // ---------- Editar destinatário ----------
  let editando = null, aoSalvar = null;
  function abrirEditor(d, depois) {
    editando = d && d.id ? d : null; aoSalvar = depois || null;
    $('dsEdTitulo').textContent = editando ? 'Editar destinatário' : 'Novo destinatário';
    $('dsNome').value = d?.nome || ''; $('dsEmail').value = d?.email || ''; $('dsSetor').value = d?.setor || '';
    $('dsUsuario').value = d?.usuario || ''; $('dsAtivo').checked = d ? d.ativo !== false : true; $('dsCopia').checked = !!d?.copia;
    window.abrirModal?.($('mDsEditar'));
    setTimeout(() => (d?.nome && !d?.email ? $('dsEmail') : $('dsNome')).focus(), 60);
  }
  async function salvar() {
    const d = { id: editando?.id || '', nome: $('dsNome').value.trim(), email: $('dsEmail').value.trim(), setor: $('dsSetor').value.trim(), usuario: $('dsUsuario').value.trim().replace(/^@/, ''), ativo: $('dsAtivo').checked, copia: $('dsCopia').checked };
    if (!d.nome) { toast('Informe o nome do destinatário.', true); return $('dsNome').focus(); }
    if (!emailValido(d.email)) { toast('Confira o e-mail: ele parece incompleto.', true); return $('dsEmail').focus(); }
    const b = $('dsSalvar'); b.disabled = true;
    const r = await api.auth('destinatarios.salvar', { novo: !d.id, destinatario: d });
    b.disabled = false;
    if (!r?.ok) return toast(erroDe(r, 'Não foi possível salvar o destinatário.'), true);
    todos = r.destinatarios || todos; dests = todos.filter((x) => x.ativo);
    window.fecharModal?.($('mDsEditar'));
    toast(d.id ? 'Destinatário atualizado.' : `${r.destinatario.nome} entrou no cadastro de destinatários.`);
    if (naTela()) { renderCadastro(); renderFila(); }
    const cb = aoSalvar; aoSalvar = null;
    cb?.(r.destinatario);
  }
  async function excluirDest(id) {
    const d = todos.find((x) => x.id === id); if (!d) return;
    const ok = await window.confirmarAcaoCorporativa?.({ titulo: 'Excluir destinatário', mensagem: `Excluir ${d.nome} (${d.email}) do cadastro?`, detalhe: 'Ele deixa de aparecer para marcar nos envios. Para só esconder por um tempo, edite e desmarque "Ativo".', confirmacao: 'Excluir', tipo: 'danger' });
    if (!ok) return;
    const r = await api.auth('destinatarios.excluir', { id });
    if (!r?.ok) return toast(erroDe(r, 'Não foi possível excluir.'), true);
    todos = r.destinatarios || todos.filter((x) => x.id !== id); dests = todos.filter((x) => x.ativo);
    renderCadastro(); toast('Destinatário excluído.');
  }
  async function importar() {
    const b = $('dsImportar'); b.disabled = true;
    const r = await api.auth('destinatarios.importar');
    b.disabled = false;
    if (!r?.ok) return toast(erroDe(r, 'Não foi possível importar.'), true);
    todos = r.destinatarios || todos; dests = todos.filter((x) => x.ativo);
    renderCadastro(); carregarFila();
    toast(r.importados ? `${r.importados} ${r.importados === 1 ? 'usuário entrou' : 'usuários entraram'} no cadastro de destinatários.` : 'Nenhum usuário novo com e-mail para importar.');
  }

  // ---------- Conferir e-mail ----------
  let conf = [], pos = 0;
  const marcadosPor = new Map(); // id do e-mail → Set de destinatários marcados
  const atual = () => conf[pos];
  const marcados = () => { const e = atual(); if (!e) return new Set(); if (!marcadosPor.has(e.id)) marcadosPor.set(e.id, new Set([...e.sugeridos, ...(e.copias || [])].filter((id) => dests.some((d) => d.id === id)))); return marcadosPor.get(e.id); };

  // Prévia num Shadow DOM (como no editor do modelo): funciona com a política de segurança do app.
  const raizPrevia = $('ecFrame').attachShadow({ mode: 'open' });
  function mostrarPrevia(html) {
    if (!html) { raizPrevia.innerHTML = ''; return; }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, iframe, object, embed, link, meta').forEach((el) => el.remove());
    doc.querySelectorAll('*').forEach((el) => [...el.attributes].forEach((a) => { if (/^on/i.test(a.name)) el.removeAttribute(a.name); }));
    doc.querySelectorAll('img').forEach((img) => { if (/logo\.png(\?|$)/.test(img.getAttribute('src') || '')) img.setAttribute('src', 'logo.png'); });
    raizPrevia.innerHTML = `<style>:host{all:initial;display:block}a{pointer-events:none}</style><div style="${(doc.body.getAttribute('style') || '').replace(/"/g, '&quot;')}">${doc.body.innerHTML}</div>`;
  }

  function abrirConferencia(lista) {
    conf = lista.slice(); pos = 0;
    if (!conf.length) return;
    $('ecBusca').value = '';
    renderConferencia();
    window.abrirModal?.($('mEmConferir'));
  }

  function renderConferencia() {
    const e = atual(); if (!e) return;
    $('ecTitulo').textContent = 'Conferir e-mail antes de enviar';
    $('ecSub').textContent = `${e.nomeTipo} · gerado por ${e.geradoPor === eu() ? 'você' : e.nome} em ${e.criadoEm}`;
    $('ecPos').textContent = conf.length > 1 ? `${pos + 1} de ${conf.length}` : '';
    $('ecDepois').textContent = conf.length > 1 && pos < conf.length - 1 ? 'Pular' : 'Agora não';
    $('ecDescartar').hidden = false;
    renderLista();
    previaJa();
  }

  function renderLista() {
    const e = atual(); if (!e) return;
    const sel = marcados();
    // Destinatário que saiu do cadastro (ou ficou inativo) deixa de contar.
    [...sel].forEach((id) => { if (!dests.some((d) => d.id === id)) sel.delete(id); });
    const busca = $('ecBusca').value.trim().toLowerCase();
    const sug = new Set(e.sugeridos), cop = new Set(e.copias || []);
    $('ecJa').hidden = !e.jaEnviado;
    $('ecJa').innerHTML = e.jaEnviado ? `${ico('check')}<span>Já enviado automaticamente para <b>${esc(e.jaEnviado)}</b>. Marque quem mais deve receber este e-mail.</span>` : '';
    const lista = dests
      .filter((d) => !busca || sel.has(d.id) || [d.nome, d.email, d.setor].join(' ').toLowerCase().includes(busca))
      .sort((a, b) => ((sug.has(b.id) || cop.has(b.id)) - (sug.has(a.id) || cop.has(a.id))) || a.nome.localeCompare(b.nome, 'pt-BR'));
    $('ecLista').innerHTML = dests.length ? (lista.length ? lista.map((d) => `
      <label class="ec-dest${sel.has(d.id) ? ' on' : ''}">
        <input type="checkbox" data-ec-dest="${esc(d.id)}" ${sel.has(d.id) ? 'checked' : ''} />
        <span class="ec-dest-txt"><b>${esc(d.nome)}</b><small>${esc(d.email)}${d.setor ? ' · ' + esc(d.setor) : ''}</small></span>
        ${sug.has(d.id) ? '<span class="perm-chip all">Sugerido</span>' : cop.has(d.id) ? '<span class="perm-chip all">Cópia</span>' : ''}
      </label>`).join('') : '<div class="us-empty">Ninguém encontrado com esse filtro.</div>')
      : `<div class="us-empty">Nenhum destinatário cadastrado ainda.${podeEditar ? '' : ' Peça para quem cuida dos cadastros incluir as pessoas na tela Destinatários.'}</div>`;
    $('ecFaltam').innerHTML = (e.semCadastro || []).map((s, i) => `
      <div class="ec-falta"><span>${ico('info')}</span><span><b>${esc(s.nome || s.usuario)}</b> ${s.email ? `(${esc(s.email)}) ` : ''}normalmente recebe este aviso, mas não está no cadastro de destinatários.</span>
        ${podeEditar ? `<button type="button" class="ghost sm" data-ec-falta="${i}">Cadastrar</button>` : ''}</div>`).join('');
    $('ecNovoDest').hidden = !podeEditar;
    $('ecTodos').hidden = dests.length < 2; $('ecNenhum').hidden = !sel.size;
    $('ecCont').textContent = sel.size ? `${sel.size} marcado${sel.size === 1 ? '' : 's'}` : 'ninguém marcado';
    const b = $('ecEnviar');
    b.disabled = !sel.size;
    b.querySelector('span').textContent = sel.size ? `Enviar para ${sel.size === 1 ? dests.find((d) => sel.has(d.id))?.nome || '1 pessoa' : sel.size + ' pessoas'}` : 'Marque quem recebe';
  }

  // Prévia montada pelo script do Google (igual ao e-mail de verdade), para o primeiro marcado.
  let timerPrevia = 0, seqPrevia = 0;
  function previa() { clearTimeout(timerPrevia); timerPrevia = setTimeout(previaJa, 350); }
  async function previaJa() {
    const e = atual(); if (!e) return;
    const sel = marcados();
    const primeiro = dests.filter((d) => sel.has(d.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))[0];
    const seq = ++seqPrevia;
    $('ecPrevStatus').textContent = 'atualizando…';
    const r = await api.auth('emails.previa', { id: e.id, destinatario: primeiro?.id || '' });
    if (seq !== seqPrevia || atual() !== e) return;
    if (!r?.ok) { $('ecPrevStatus').textContent = ''; $('ecAssunto').textContent = '—'; mostrarPrevia(''); return toast(erroDe(r, 'Não foi possível montar a prévia.'), true); }
    $('ecPrevStatus').textContent = '';
    $('ecAssunto').textContent = r.assunto || '—';
    mostrarPrevia(r.html);
    $('ecPrevNota').textContent = sel.size > 1 ? `Prévia como ${r.para} vai receber. Cada pessoa marcada recebe a mesma mensagem com o próprio nome.` : `Prévia como ${r.para || 'o destinatário'} vai receber.`;
  }

  function proximo() {
    pos++;
    if (pos >= conf.length) { window.fecharModal?.($('mEmConferir')); conf = []; pos = 0; atualizarBadge(); if (naTela()) renderFila(); return; }
    renderConferencia();
  }

  async function enviar() {
    const e = atual(); if (!e) return;
    const ids = [...marcados()];
    if (!ids.length) return toast('Marque pelo menos um destinatário.', true);
    const b = $('ecEnviar'); b.disabled = true; b.querySelector('span').textContent = 'Enviando…';
    const r = await api.auth('emails.enviar', { id: e.id, destinatarios: ids });
    if (!r?.ok) { renderLista(); return toast(erroDe(r, 'Não foi possível enviar o e-mail.'), true); }
    fila = fila.filter((x) => x.id !== e.id);
    recentes.unshift({ ...e, situacao: 'ENVIADO', enviadoPor: AUTH()?.usuario?.nome || 'você', enviadoEm: 'agora', destinatarios: (r.para || []).join(', '), assunto: r.assunto });
    marcadosPor.delete(e.id); atualizarBadge();
    toast(r.enviados === 1 ? `E-mail enviado para ${String(r.para[0]).replace(/\s*<.*$/, '')}.` : `E-mail enviado para ${r.enviados} pessoas.`);
    proximo();
  }

  async function descartar(id) {
    const e = fila.find((x) => x.id === id) || conf.find((x) => x.id === id); if (!e) return;
    const ok = await window.confirmarAcaoCorporativa?.({ titulo: 'Descartar e-mail', mensagem: `Descartar o e-mail "${e.nomeTipo}: ${(e.pedidos[0] ? e.pedidos[0].de + ' → ' + e.pedidos[0].para : e.resumo)}"?`, detalhe: 'Ele não será enviado para ninguém e sai da lista de e-mails para conferir.', confirmacao: 'Descartar', tipo: 'danger' });
    if (!ok) return false;
    const r = await api.auth('emails.descartar', { id });
    if (!r?.ok) { toast(erroDe(r, 'Não foi possível descartar.'), true); return false; }
    fila = fila.filter((x) => x.id !== id);
    recentes.unshift({ ...e, situacao: 'DESCARTADO', enviadoPor: AUTH()?.usuario?.nome || 'você', enviadoEm: 'agora' });
    atualizarBadge(); if (naTela()) renderFila();
    toast('E-mail descartado.');
    return true;
  }

  // ---------- Eventos ----------
  $('ecLista').addEventListener('change', (ev) => {
    const cb = ev.target.closest('[data-ec-dest]'); if (!cb) return;
    const sel = marcados();
    if (cb.checked) sel.add(cb.dataset.ecDest); else sel.delete(cb.dataset.ecDest);
    renderLista(); previa();
  });
  $('ecBusca').addEventListener('input', renderLista);
  $('ecTodos').addEventListener('click', () => { const sel = marcados(); dests.forEach((d) => sel.add(d.id)); renderLista(); previa(); });
  $('ecNenhum').addEventListener('click', () => { marcados().clear(); renderLista(); previa(); });
  const cadastrarEMarcar = (base) => abrirEditor(base, (d) => {
    const e = atual();
    if (e && d?.ativo) {
      marcados().add(d.id);
      if (!e.sugeridos.includes(d.id) && base && (base.usuario || base.email)) e.sugeridos.push(d.id);
      e.semCadastro = (e.semCadastro || []).filter((s) => !((s.usuario && s.usuario === d.usuario) || (s.email && s.email === d.email) || s === base));
    }
    renderLista(); previa();
  });
  $('ecFaltam').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ec-falta]'); if (!b) return;
    const s = atual()?.semCadastro?.[Number(b.dataset.ecFalta)]; if (!s) return;
    cadastrarEMarcar({ nome: s.nome, email: s.email, usuario: s.usuario, ativo: true, _falta: true });
  });
  $('ecNovoDest').addEventListener('click', () => cadastrarEMarcar(null));
  $('ecEnviar').addEventListener('click', enviar);
  $('ecDepois').addEventListener('click', () => { toast('O e-mail ficou como pendência no sino de notificações. Dá para enviar ou excluir por lá.'); proximo(); });
  $('ecDescartar').addEventListener('click', async () => { const e = atual(); if (e && await descartar(e.id)) proximo(); });
  new MutationObserver(() => { if (!$('mEmConferir').classList.contains('open') && conf.length) { conf = []; pos = 0; atualizarBadge(); if (naTela()) renderFila(); } })
    .observe($('mEmConferir'), { attributes: true, attributeFilter: ['class'] });

  $('dsFila').addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-em-conferir]');
    if (c) { const e = fila.find((x) => x.id === c.dataset.emConferir); if (e) abrirConferencia([e]); return; }
    const d = ev.target.closest('[data-em-descartar]');
    if (d) descartar(d.dataset.emDescartar);
  });
  $('dsConferirTodos').addEventListener('click', () => abrirConferencia(fila));
  $('dsLista').addEventListener('click', (ev) => {
    const ed = ev.target.closest('[data-ds-editar]');
    if (ed) return abrirEditor(todos.find((x) => x.id === ed.dataset.dsEditar));
    const ex = ev.target.closest('[data-ds-excluir]');
    if (ex) excluirDest(ex.dataset.dsExcluir);
  });
  $('dsBusca').addEventListener('input', renderCadastro);
  $('dsNovo').addEventListener('click', () => abrirEditor(null));
  $('dsImportar').addEventListener('click', importar);
  $('dsSalvar').addEventListener('click', salvar);
  $('mDsEditar').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); salvar(); } });
  $('dsAtualizar').addEventListener('click', render);

  // ---------- Ciclo ----------
  window.addEventListener('gm-entrou', () => { entrou = true; setTimeout(() => carregarFila(), 3500); });
  // Ao gerar o PDF ou registrar: o aviso dos pedidos incluídos aparece para conferir.
  window.addEventListener('gm-minuta-registrada', () => { setTimeout(() => carregarFila(), 1500); setTimeout(() => carregarFila(), 20000); });
  let ultimoFoco = 0;
  window.addEventListener('focus', () => { if (Date.now() - ultimoFoco > 20000) { ultimoFoco = Date.now(); carregarFila(); } });
  let ultimo = 0;
  setInterval(() => {
    const intervalo = document.hidden ? 300000 : 120000;
    if (Date.now() - ultimo >= intervalo) { ultimo = Date.now(); carregarFila(); }
  }, 20000);

  // Chamado pelas outras telas logo depois de uma ação que gerou e-mail (recusar, reabrir, comentar).
  async function conferir(ids) {
    ids = (ids || []).filter(Boolean);
    if (!ids.length) return;
    while (carregando) await new Promise((r) => setTimeout(r, 200));
    await carregarFila({ abrirNovos: false });
    const lista = fila.filter((e) => ids.includes(e.id));
    if (lista.length) abrirConferencia(lista);
  }

  window.DESTINATARIOS = { render, carregar: carregarFila };
  window.EMAILS = {
    conferir,
    pendentes: () => (indisponivel ? [] : fila.slice()),
    abrir: (id) => { const e = fila.find((x) => x.id === id); if (e) abrirConferencia([e]); },
    descartar: (id) => descartar(id),
    carregar: () => carregarFila({ abrirNovos: false }),
  };
})();
