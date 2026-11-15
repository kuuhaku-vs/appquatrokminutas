/* =========================================================
   GERADOR DE MINUTAS · HISTÓRICO DE AÇÕES / AUDITORIA (v2.9)
   - Tela Usuários › "Histórico de ações" (só o Administrador).
   - Lê a aba "Auditoria" da planilha: quem fez o quê e quando
     (entradas, minutas, pedidos, comentários, usuários, e-mail).
========================================================= */
(function () {
  const api = window.api;
  if (!api || !api.auth) return;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, e) => window.toast?.(m, e);
  const MSG_SCRIPT = 'O histórico de ações precisa da versão 2.9 do script do Google.';
  const erroDe = (r, padrao) => (/minuta inválido|desconhecida/i.test(r?.error || '') ? MSG_SCRIPT : (r?.error || padrao));

  const GRUPOS = [['', 'Todas as ações'], ['acesso', 'Acesso e conta'], ['minutas', 'Minutas'], ['pedidos', 'Pedidos e comentários'], ['usuarios', 'Usuários'], ['email', 'Modelo de e-mail']];
  // Cor do marcador de cada tipo de ação.
  const tipoDe = (acao) => /recus|exclu|login recusado/i.test(acao) ? 'perigo'
    : /criou|registrou|entrou/i.test(acao) ? 'ok'
    : /lembrete/i.test(acao) ? 'aviso' : 'info';

  // ---------- Marcação ----------
  const ancora = document.getElementById('emCard') || document.getElementById('usCardLista');
  ancora?.insertAdjacentHTML('afterend', `
    <section class="card au-card" id="auCard" hidden>
      <div class="card-h"><h3 data-ico="shield">Histórico de ações</h3>
        <div class="card-actions"><button class="ghost" id="auAbrir" type="button" data-ico="history"><span>Ver histórico</span></button></div></div>
      <p class="hint" id="auResumo">Registro de quem fez o quê e quando: entradas no sistema, minutas, pedidos, comentários, usuários e e-mail. Fica na aba "Auditoria" da planilha.</p>
      <div class="au-ultimos" id="auUltimos"></div>
    </section>`);

  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal" id="mAuditoria" aria-hidden="true"><div class="mbox xl au-box" role="dialog" aria-modal="true" aria-labelledby="auTitulo">
    <div class="m-head">
      <div class="m-title"><span class="m-badge" data-ico="shield"></span><div><h3 id="auTitulo">Histórico de ações</h3><p id="auSub">Mais recentes primeiro.</p></div></div>
      <button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button>
    </div>
    <div class="au-filtros">
      <label class="field au-busca"><span>Buscar</span><input id="auBusca" type="search" autocomplete="off" title="Procure por pessoa, ação, número de minuta, pedido ou qualquer texto do registro." /></label>
      <label class="field"><span>Tipo</span><select id="auGrupo" title="Mostrar só um tipo de ação">${GRUPOS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label>
      <button class="ghost" id="auAtualizar" type="button" data-ico="refresh"><span>Atualizar</span></button>
    </div>
    <div class="m-body au-body"><div class="au-lista" id="auLista"></div></div>
    <div class="m-foot"><span class="hint au-total" id="auTotal"></span><button class="ghost" id="auCsv" type="button" data-ico="table"><span>Baixar CSV</span></button><button class="ghost" data-close type="button">Fechar</button></div>
  </div></div>`);
  window.hidratarIcones?.();

  const modal = $('mAuditoria');
  modal.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => window.fecharModal?.(modal)));
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) window.fecharModal?.(modal); });

  let registros = [], seq = 0, timer = 0;

  const linhaHtml = (r) => `
    <div class="au-item au-${tipoDe(r.acao)}">
      <span class="au-marca" aria-hidden="true"></span>
      <div class="au-main">
        <div class="au-top"><b>${esc(r.acao)}</b>${r.alvo ? `<span class="au-alvo">${esc(r.alvo)}</span>` : ''}</div>
        ${r.detalhes ? `<div class="au-det">${esc(r.detalhes)}</div>` : ''}
      </div>
      <div class="au-quem"><b>${esc(r.nome || r.usuario || '—')}</b><small>${r.usuario && r.usuario !== 'sistema' ? '@' + esc(r.usuario) + ' · ' : ''}${esc(r.data)}</small></div>
    </div>`;

  async function carregar(espera = 0) {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const n = ++seq;
      $('auLista').innerHTML = registros.length ? $('auLista').innerHTML : '<div class="us-empty">Carregando…</div>';
      const r = await api.auth('usuarios.auditoria', { busca: $('auBusca').value.trim(), grupo: $('auGrupo').value, limite: 500 });
      if (n !== seq) return;
      if (!r?.ok) { $('auLista').innerHTML = `<div class="us-empty">${esc(erroDe(r, 'Não foi possível ler o histórico.'))}</div>`; return; }
      registros = r.registros || [];
      $('auLista').innerHTML = registros.length ? registros.map(linhaHtml).join('') : '<div class="us-empty">Nenhum registro encontrado com esse filtro.</div>';
      $('auTotal').textContent = `${registros.length} de ${r.total} registro${r.total === 1 ? '' : 's'}${registros.length >= 500 ? ' (mostrando os 500 mais recentes; use a busca para achar os antigos)' : ''}`;
    }, espera);
  }

  async function carregarCard() {
    const card = $('auCard');
    const AUTH = window.AUTH;
    if (!card || !AUTH || AUTH.legado || !AUTH.pode?.('usuarios.gerenciar')) { if (card) card.hidden = true; return; }
    card.hidden = false;
    const r = await api.auth('usuarios.auditoria', { limite: 20 });
    if (!r?.ok) { $('auUltimos').innerHTML = ''; $('auResumo').textContent = erroDe(r, 'Não foi possível ler o histórico.'); return; }
    $('auResumo').textContent = 'Registro de quem fez o quê e quando: entradas no sistema, minutas, pedidos, comentários, usuários e e-mail. Fica na aba "Auditoria" da planilha.';
    const ultimos = (r.registros || []).slice(0, 5);
    $('auUltimos').innerHTML = ultimos.length ? ultimos.map(linhaHtml).join('') : '<div class="us-empty">Nenhuma ação registrada ainda. As próximas ações aparecem aqui.</div>';
  }

  const AUTH = window.AUTH;
  if (AUTH && typeof AUTH.renderUsuarios === 'function') {
    const original = AUTH.renderUsuarios;
    AUTH.renderUsuarios = function () { const r = original.apply(this, arguments); carregarCard(); return r; };
  }

  function baixarCsv() {
    if (!registros.length) return toast('Nada para baixar com esse filtro.', true);
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [['Data', 'Usuário', 'Nome', 'Ação', 'Alvo', 'Detalhes'].map(q).join(';')]
      .concat(registros.map((r) => [r.data, r.usuario, r.nome, r.acao, r.alvo, r.detalhes].map(q).join(';')));
    const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `historico-de-acoes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  $('auAbrir').addEventListener('click', () => { registros = []; window.abrirModal?.(modal); carregar(0); setTimeout(() => $('auBusca').focus(), 80); });
  $('auBusca').addEventListener('input', () => carregar(450));
  $('auGrupo').addEventListener('change', () => carregar(0));
  $('auAtualizar').addEventListener('click', () => carregar(0));
  $('auCsv').addEventListener('click', baixarCsv);

  window.AUDITORIA = { carregarCard };
})();
