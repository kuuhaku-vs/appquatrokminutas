/* =========================================================
   GERADOR DE MINUTAS · MODELO DO E-MAIL DE AVISO (v2.8)
   - Tela Usuários › "Aviso por e-mail" (só o Administrador).
   - Edita o e-mail que vai para quem fez o pedido de envio quando ele é
     incluído na minuta ou recusado: assunto, textos, quadro de detalhes,
     botão, assinatura e rodapé, com prévia ao vivo.
   - O modelo fica no script do Google (vale para todos os aparelhos);
     a prévia é montada pelo próprio script, igual ao e-mail de verdade.
========================================================= */
(function () {
  const api = window.api;
  if (!api || !api.auth) return;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.toast?.(m, e);
  const MSG_SCRIPT = 'O script do Google precisa ser atualizado para a versão 2.8 para editar o e-mail.';
  const MSG_AUTORIZAR = 'Falta autorizar o envio de e-mail: no Apps Script da planilha, escolha a função testarEmail, clique em Executar e permita "Enviar e-mail como você".';
  const erroDe = (r, padrao) => {
    const e = r?.error || '';
    if (/minuta inválido|desconhecida/i.test(e)) return MSG_SCRIPT;
    if (/MailApp|script\.send_mail|permiss[aã]o para chamar/i.test(e)) return MSG_AUTORIZAR;
    return e || padrao;
  };

  const VARS = [
    ['primeiro_nome', 'Primeiro nome de quem recebe o e-mail'], ['nome', 'Nome completo de quem recebe'], ['email', 'E-mail de quem recebe'], ['usuario', 'Usuário de quem recebe (ou o começo do e-mail)'],
    ['minuta', 'Número da minuta'], ['o_seu_pedido', '"o seu pedido de envio" (ou "os seus pedidos…" quando são vários)'],
    ['atendente', 'Quem incluiu ou recusou'], ['data', 'Data e hora da inclusão ou recusa'],
    ['de', 'Quem está enviando'], ['para', 'Para quem vai'], ['motivo', 'Motivo da recusa'],
    ['nota', 'Observação de quem reabriu o pedido'], ['autor', 'Quem escreveu o comentário'], ['comentario', 'Texto do comentário'], ['horas', 'Horas do lembrete'], ['total', 'Quantidade de pedidos parados'],
  ];
  const TIPOS = { incluido: 'pedido incluído', recusado: 'pedido recusado', reaberto: 'pedido reaberto', comentario: 'comentário no pedido', lembrete: 'lembrete de pedido parado' };
  const CAMPOS = [['minuta', 'Nº da minuta'], ['de', 'De'], ['para', 'Para'], ['quantidade', 'Quantidade e conteúdo'], ['observacao', 'Observação'], ['pedidoEm', 'Data do pedido'], ['motivo', 'Motivo (recusa)']];

  const campoTxt = (k, rotulo, dica, opts = {}) => {
    const attrs = `data-k="${k}" maxlength="${opts.max || 2000}" title="${esc(dica)}"`;
    return `<label class="field${opts.span ? ' span2' : ''}"${opts.tipo ? ` data-tipo="${opts.tipo}"` : ''}><span>${rotulo}</span>${opts.linhas
      ? `<textarea ${attrs} rows="${opts.linhas}"></textarea>` : `<input ${attrs} autocomplete="off" />`}</label>`;
  };
  const tipoCampos = (t) => `
    ${campoTxt(t + '.assunto', 'Assunto', 'Assunto do e-mail. Não pode ficar vazio.', { span: 1, tipo: t, max: 200 })}
    ${campoTxt(t + '.abertura', 'Texto de abertura', 'Primeiro parágrafo do e-mail. Deixe vazio para não mostrar.', { span: 1, tipo: t, linhas: 3 })}
    ${campoTxt(t + '.selo', 'Selo do quadro', 'Etiqueta colorida no quadro de detalhes (ex.: INCLUÍDO). Vazio esconde o selo.', { tipo: t, max: 30 })}
    ${campoTxt(t + '.linhaAtendente', 'Linha abaixo do quadro', 'Quem atendeu e quando. Vazio esconde a linha.', { tipo: t, max: 200 })}
    ${campoTxt(t + '.fechamento', 'Texto de fechamento', 'Parágrafo depois do quadro. Vazio para não mostrar.', { span: 1, tipo: t, linhas: 3 })}`;

  // ---------- Marcação ----------
  document.getElementById('usCardLista')?.insertAdjacentHTML('afterend', `
    <section class="card em-card" id="emCard" hidden>
      <div class="card-h"><h3 data-ico="mail">Aviso por e-mail <span class="perm-chip" id="emStatus">…</span></h3>
        <div class="card-actions"><button class="primary" id="emAbrir" type="button" data-ico="edit"><span>Editar modelo</span></button></div></div>
      <p class="hint" id="emResumo">Quem fez o pedido recebe automático os avisos de pedido incluído, recusado, reaberto, comentado e parado. Outros destinatários (gestor etc.) só depois de conferido. Aqui você muda o texto, a assinatura e o que aparece no e-mail.</p>
    </section>`);

  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal" id="mEmailModelo" aria-hidden="true"><div class="mbox xl em-box" role="dialog" aria-modal="true" aria-labelledby="emTitulo">
    <div class="m-head">
      <div class="m-title"><span class="m-badge" data-ico="mail"></span><div><h3 id="emTitulo">Modelo do e-mail de aviso</h3><p>Vale para todos os aparelhos. Campo vazio = não aparece no e-mail.</p></div></div>
      <button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button>
    </div>
    <div class="m-body em-body">
      <div class="em-form" id="emForm">
        <div class="seg em-tabs" role="tablist"><button type="button" class="active" data-em-tipo="incluido">Incluído</button><button type="button" data-em-tipo="recusado">Recusado</button><button type="button" data-em-tipo="reaberto">Reaberto</button><button type="button" data-em-tipo="comentario">Comentário</button><button type="button" data-em-tipo="lembrete">Lembrete</button></div>
        <p class="hint em-tipo-desc" id="emTipoDesc"></p>

        <div class="em-lembrete" data-tipo="lembrete">
          <span class="sub-title">Lembrete de pedido parado</span>
          <div class="chips-check"><label><input type="checkbox" data-k="lembrete.ativo" /><span>Enviar lembrete de pedido parado para quem pediu</span></label></div>
          <div class="fgrid">
            <label class="field"><span>Avisar depois de (horas)</span><input data-k="lembrete.horas" type="number" min="1" max="720" step="1" title="Quantas horas um pedido pode ficar aguardando antes do lembrete. O lembrete se repete a cada esse número de horas enquanto o pedido continuar parado." /></label>
          </div>
        </div>

        <span class="sub-title">Envio</span>
        <div class="chips-check"><label><input type="checkbox" data-k="ativo" /><span>Enviar os avisos por e-mail</span></label></div>
        <div class="fgrid">
          ${campoTxt('remetente', 'Nome do remetente', 'Nome que aparece como remetente na caixa de entrada.', { max: 80 })}
          ${campoTxt('responderPara', 'Responder para <i>(opcional)</i>', 'E-mail que recebe as respostas. Vazio: vai para quem atendeu o pedido (se tiver e-mail) ou para a conta do script.', { max: 120 })}
        </div>

        <span class="sub-title">Cabeçalho</span>
        <div class="chips-check"><label><input type="checkbox" data-k="mostrarLogo" /><span>Mostrar o logo da Quatro K</span></label></div>
        <div class="fgrid">${campoTxt('faixa', 'Texto abaixo do logo', 'Linha pequena no cabeçalho, abaixo do logo. Vazio esconde.', { span: 1, max: 80 })}</div>

        <span class="sub-title">Mensagem · <b id="emTipoNome">pedido incluído</b></span>
        <div class="fgrid">
          ${campoTxt('saudacao', 'Saudação <i>(vale para todos)</i>', 'Primeira linha do e-mail. Vazio esconde.', { span: 1, max: 120 })}
          ${tipoCampos('incluido')}
          ${tipoCampos('recusado')}
          ${tipoCampos('reaberto')}
          ${tipoCampos('comentario')}
          ${tipoCampos('lembrete')}
        </div>

        <span class="sub-title">Quadro de detalhes</span>
        <div class="chips-check em-campos">${CAMPOS.map(([k, n]) => `<label><input type="checkbox" data-k="campos.${k}" /><span>${n}</span></label>`).join('')}</div>

        <span class="sub-title">Botão</span>
        <div class="chips-check"><label><input type="checkbox" data-k="botao.mostrar" /><span>Mostrar o botão que abre o Gerador</span></label></div>
        <div class="fgrid">${campoTxt('botao.texto', 'Texto do botão', 'Texto do botão azul.', { span: 1, max: 60 })}</div>

        <span class="sub-title">Assinatura e rodapé</span>
        <div class="fgrid">
          ${campoTxt('despedida', 'Despedida', 'Linha antes da assinatura (ex.: Atenciosamente,). Vazio esconde.', { span: 1, max: 120 })}
          ${campoTxt('assinatura', 'Assinatura <i>(uma informação por linha; a primeira fica em destaque)</i>', 'Nome, cargo, empresa, telefone… uma por linha. Apague as linhas que não quiser. Vazio esconde a assinatura.', { span: 1, linhas: 4, max: 500 })}
          ${campoTxt('rodape', 'Rodapé', 'Texto pequeno no fim do e-mail. Vazio esconde.', { span: 1, linhas: 2, max: 500 })}
        </div>

        <div class="em-vars">
          <span class="sub-title">Variáveis <i>(clique para inserir no campo selecionado)</i></span>
          <div class="em-var-list">${VARS.map(([k, d]) => `<button type="button" class="em-var" data-var="{${k}}" title="${esc(d)}">{${k}}</button>`).join('')}</div>
          <p class="hint">Use <code>**texto**</code> para negrito e uma linha em branco para começar outro parágrafo.</p>
        </div>
      </div>

      <div class="em-preview">
        <div class="em-prev-head"><small>Assunto</small><strong id="emAssunto">—</strong><span class="em-prev-status" id="emPrevStatus"></span></div>
        <div id="emFrame" class="em-frame" role="document" aria-label="Prévia do e-mail"></div>
        <p class="hint em-prev-nota">Prévia com um pedido de exemplo. O e-mail de verdade usa os dados do pedido.</p>
      </div>
    </div>
    <div class="m-foot">
      <button class="ghost em-restaurar" id="emRestaurar" type="button" data-ico="refresh"><span>Restaurar padrão</span></button>
      <button class="ghost" id="emTeste" type="button" data-ico="send"><span>Enviar teste para mim</span></button>
      <button class="ghost" data-close type="button">Cancelar</button>
      <button class="primary" id="emSalvar" type="button">Salvar modelo</button>
    </div>
  </div></div>`);
  window.hidratarIcones?.();

  // Fecha pelo X, Cancelar, fundo e Esc como as outras janelas.
  const modal = $('mEmailModelo');
  modal.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => window.fecharModal?.(modal)));
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) window.fecharModal?.(modal); });

  // ---------- Estado ----------
  let modelo = null, padrao = null, personalizado = false, tipo = 'incluido', ultimoCampo = null, timerPrevia = 0, seqPrevia = 0, sujo = false;

  // Prévia num Shadow DOM (não num iframe): funciona com a política de segurança do app,
  // inclusive no programa do Windows. innerHTML não executa scripts; o e-mail só tem estilos em linha.
  const raizPrevia = $('emFrame').attachShadow({ mode: 'open' });
  function mostrarPrevia(html) {
    if (!html) { raizPrevia.innerHTML = ''; return; }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, iframe, object, embed, link, meta').forEach((el) => el.remove());
    doc.querySelectorAll('*').forEach((el) => [...el.attributes].forEach((a) => { if (/^on/i.test(a.name)) el.removeAttribute(a.name); }));
    doc.querySelectorAll('img').forEach((img) => { if (/logo\.png(\?|$)/.test(img.getAttribute('src') || '')) img.setAttribute('src', 'logo.png'); });
    doc.querySelectorAll('a').forEach((a) => { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); a.addEventListener?.('click', (e) => e.preventDefault()); });
    raizPrevia.innerHTML = `<style>:host{all:initial;display:block}a{pointer-events:none}</style><div style="${(doc.body.getAttribute('style') || '').replace(/"/g, '&quot;')}">${doc.body.innerHTML}</div>`;
  }

  const pegar = (obj, k) => k.split('.').reduce((o, p) => (o == null ? undefined : o[p]), obj);
  const por = (obj, k, v) => { const ps = k.split('.'); let o = obj; ps.slice(0, -1).forEach((p) => (o = o[p] = o[p] || {})); o[ps[ps.length - 1]] = v; };
  const campos = () => [...modal.querySelectorAll('[data-k]')];

  function preencher(m) {
    campos().forEach((el) => { const v = pegar(m, el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? ''; });
  }
  function ler() {
    const m = JSON.parse(JSON.stringify(modelo || padrao || {}));
    campos().forEach((el) => por(m, el.dataset.k, el.type === 'checkbox' ? el.checked : el.value));
    return m;
  }
  function mostrarTipo(t) {
    tipo = t;
    modal.querySelectorAll('[data-em-tipo]').forEach((b) => b.classList.toggle('active', b.dataset.emTipo === t));
    modal.querySelectorAll('[data-tipo]').forEach((el) => (el.hidden = el.dataset.tipo !== t));
    $('emTipoNome').textContent = TIPOS[t];
    $('emTipoDesc').textContent = {
      incluido: 'Vai para quem fez o pedido quando ele entra numa minuta.',
      recusado: 'Vai para quem fez o pedido quando ele é recusado, com o motivo.',
      reaberto: 'Vai para quem fez o pedido quando um pedido recusado (ou cancelado) volta para a fila, para um envio posterior.',
      comentario: 'Quando quem monta o malote comenta, vai automático para quem pediu. Quando quem pediu comenta, o e-mail fica para conferir antes de enviar.',
      lembrete: 'Vai automático para quem pediu quando o pedido fica aguardando mais tempo que o configurado (e, conferido, para quem está "Sempre em cópia").',
    }[t];
    atualizarPrevia(0);
  }

  async function atualizarPrevia(espera = 650) {
    clearTimeout(timerPrevia);
    $('emPrevStatus').textContent = 'Atualizando…';
    timerPrevia = setTimeout(async () => {
      const n = ++seqPrevia;
      const r = await api.auth('usuarios.emailprevia', { tipo, modelo: ler() });
      if (n !== seqPrevia) return; // chegou uma resposta mais nova
      if (!r?.ok) { $('emPrevStatus').textContent = erroDe(r, 'Não foi possível montar a prévia.'); return; }
      $('emAssunto').textContent = r.assunto || '—';
      mostrarPrevia(r.html || '');
      $('emPrevStatus').textContent = '';
    }, espera);
  }

  // ---------- Card na tela Usuários ----------
  async function carregarCard() {
    const card = $('emCard');
    const AUTH = window.AUTH;
    if (!card || !AUTH || AUTH.legado || !AUTH.pode?.('usuarios.gerenciar')) { if (card) card.hidden = true; return; }
    card.hidden = false;
    const r = await api.auth('usuarios.emailmodelo');
    const st = $('emStatus');
    if (!r?.ok) { st.className = 'perm-chip wait'; st.textContent = 'Atualize o script'; $('emResumo').textContent = erroDe(r, 'Não foi possível ler o modelo do e-mail.'); return; }
    modelo = r.modelo; padrao = r.padrao; personalizado = !!r.personalizado;
    st.className = 'perm-chip ' + (r.modelo.ativo ? 'ok' : 'off');
    st.textContent = (r.modelo.ativo ? 'Ligado' : 'Desligado') + ' · ' + (personalizado ? 'modelo personalizado' : 'modelo padrão');
    $('emResumo').textContent = r.modelo.ativo
      ? `Avisos de pedido incluído, recusado, reaberto e de comentários${r.modelo.lembrete?.ativo ? `, e lembrete de pedido parado há mais de ${r.modelo.lembrete.horas} h` : ''}. Quem pediu recebe automático; os outros destinatários só depois de conferido (tela Destinatários). Você pode mudar o texto, a assinatura e o que aparece no e-mail.`
      : 'Os avisos por e-mail estão desligados. Abra o modelo para ligar de novo.';
  }
  const AUTH = window.AUTH;
  if (AUTH && typeof AUTH.renderUsuarios === 'function') {
    const original = AUTH.renderUsuarios;
    AUTH.renderUsuarios = function () { const r = original.apply(this, arguments); carregarCard(); return r; };
  }

  // ---------- Eventos ----------
  $('emAbrir').addEventListener('click', async () => {
    const b = $('emAbrir'); b.disabled = true;
    const r = await api.auth('usuarios.emailmodelo');
    b.disabled = false;
    if (!r?.ok) return toast(erroDe(r, 'Não foi possível abrir o modelo do e-mail.'), true);
    modelo = r.modelo; padrao = r.padrao; personalizado = !!r.personalizado; sujo = false;
    preencher(modelo);
    mostrarPrevia('');
    window.abrirModal?.(modal);
    mostrarTipo('incluido');
  });
  modal.querySelectorAll('[data-em-tipo]').forEach((b) => b.addEventListener('click', () => mostrarTipo(b.dataset.emTipo)));
  $('emForm').addEventListener('input', () => { sujo = true; atualizarPrevia(); });
  $('emForm').addEventListener('change', (e) => { if (e.target.type === 'checkbox') { sujo = true; atualizarPrevia(0); } });
  $('emForm').addEventListener('focusin', (e) => { if (e.target.matches('input[data-k]:not([type="checkbox"]), textarea[data-k]')) ultimoCampo = e.target; });
  modal.querySelector('.em-var-list').addEventListener('mousedown', (e) => e.preventDefault()); // não tira o foco do campo
  modal.querySelector('.em-var-list').addEventListener('click', (e) => {
    const v = e.target.closest('[data-var]')?.dataset.var; if (!v) return;
    const el = ultimoCampo && !ultimoCampo.closest('[hidden]') ? ultimoCampo : null;
    if (!el) return toast('Clique primeiro no campo onde a variável deve entrar.', true);
    const ini = el.selectionStart ?? el.value.length, fim = el.selectionEnd ?? ini;
    el.value = el.value.slice(0, ini) + v + el.value.slice(fim);
    el.focus(); el.setSelectionRange(ini + v.length, ini + v.length);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  $('emSalvar').addEventListener('click', async () => {
    const m = ler();
    const semAssunto = Object.keys(TIPOS).find((t) => !String(m[t]?.assunto || '').trim());
    if (semAssunto) { mostrarTipo(semAssunto); return toast(`O assunto do e-mail de ${TIPOS[semAssunto]} não pode ficar vazio.`, true); }
    const h = Number(m.lembrete?.horas);
    if (!(h >= 1 && h <= 720)) { mostrarTipo('lembrete'); return toast('O lembrete precisa de um tempo entre 1 e 720 horas.', true); }
    if (m.responderPara && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.responderPara.trim())) return toast('Confira o e-mail de "Responder para".', true);
    const b = $('emSalvar'); b.disabled = true;
    const r = await api.auth('usuarios.emailsalvar', { modelo: m });
    b.disabled = false;
    if (!r?.ok) return toast(erroDe(r, 'Não foi possível salvar o modelo.'), true);
    modelo = r.modelo; sujo = false;
    window.fecharModal?.(modal);
    toast('Modelo do e-mail salvo. Os próximos avisos já saem assim.');
    carregarCard();
  });

  $('emRestaurar').addEventListener('click', async () => {
    const ok = window.confirmarAcaoCorporativa
      ? await window.confirmarAcaoCorporativa({ titulo: 'Restaurar o e-mail padrão?', mensagem: 'O texto que você editou será apagado e volta o modelo original.', detalhe: 'Vale para os próximos avisos de todos os aparelhos.', confirmacao: 'Restaurar padrão', tipo: 'danger' })
      : true;
    if (!ok) return;
    const b = $('emRestaurar'); b.disabled = true;
    const r = await api.auth('usuarios.emailsalvar', { restaurar: true });
    b.disabled = false;
    if (!r?.ok) return toast(erroDe(r, 'Não foi possível restaurar o modelo.'), true);
    modelo = r.modelo; padrao = r.padrao || r.modelo; sujo = false;
    preencher(modelo); atualizarPrevia(0); carregarCard();
    toast('Modelo padrão restaurado.');
  });

  $('emTeste').addEventListener('click', async () => {
    const b = $('emTeste'); b.disabled = true;
    const r = await api.auth('usuarios.emailteste', { modelo: ler() });
    b.disabled = false;
    if (!r?.ok) return toast(erroDe(r, 'Não foi possível enviar o teste.'), true);
    toast(`${r.enviados || 5} e-mails de teste (um de cada tipo) enviados para ${r.para}${sujo ? '. Lembre de salvar o modelo.' : '.'}`);
  });

  window.EMAIL_MODELO = { carregarCard };
})();
