/* =========================================================
   GERADOR DE MINUTAS · LOGIN E CONTROLE DE ACESSO (v2.4)
   - Tela de login animada (o malote reage ao que você digita).
   - Guarda a sessão e só carrega o app.js depois do login.
   - Esconde telas e botões conforme as permissões do usuário.
   - Tela "Usuários" (para quem pode gerenciar) e "Minha conta".
   Quem manda de verdade é o script do Google: ele confere a sessão
   e a permissão em cada pedido. Aqui é só a parte visual.
========================================================= */
(function () {
  const api = window.api;
  const APP_SRC = document.currentScript?.dataset.app || 'app.js';
  const K_SESSAO = 'gm_sessao_v1';
  const ico = window.ICO || (() => '');
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- permissões (mesmos nomes do GoogleSheets_Script.gs) ----------
  const PERMS = [
    { id: 'historico.ver', grupo: 'acessar', nome: 'Histórico', dica: 'Consultar as minutas registradas' },
    { id: 'frete.usar', grupo: 'acessar', nome: 'Frete cortesia', dica: 'Imprimir o documento de frete cortesia' },
    { id: 'config.acessar', grupo: 'acessar', nome: 'Configurações', dica: 'Numeração, planilha e formatação da impressão' },
    { id: 'minutas.criar', grupo: 'alterar', nome: 'Criar minutas', dica: 'Gerar e registrar minutas novas' },
    { id: 'minutas.editar', grupo: 'alterar', nome: 'Alterar minutas', dica: 'Reabrir e gravar de novo minutas já registradas' },
    { id: 'minutas.excluir', grupo: 'alterar', nome: 'Excluir minutas', dica: 'Remover minutas da planilha' },
    { id: 'cadastros.editar', grupo: 'alterar', nome: 'Alterar cadastros', dica: 'Pessoas, setores e remetente/destinatário padrão' },
    { id: 'usuarios.gerenciar', grupo: 'alterar', nome: 'Gerenciar usuários', dica: 'Criar usuários e definir o que cada um pode fazer' },
  ];
  const TODAS = PERMS.map((p) => p.id);
  const PERFIS = {
    admin: { nome: 'Administrador', dica: 'Acesso total, incluindo usuários.', perms: TODAS },
    operador: { nome: 'Operador', dica: 'Cria e altera minutas. Não exclui.', perms: ['minutas.criar', 'minutas.editar', 'historico.ver', 'frete.usar', 'cadastros.editar'] },
    consulta: { nome: 'Consulta', dica: 'Só vê o histórico.', perms: ['historico.ver'] },
    personalizado: { nome: 'Personalizado', dica: 'Você marca item por item.', perms: null },
  };
  const TELAS = { nova: ['minutas.criar', 'minutas.editar'], historico: ['historico.ver'], frete: ['frete.usar'], config: ['config.acessar'], usuarios: ['usuarios.gerenciar'] };

  // ---------- estado e sessão guardada ----------
  const S = { usuario: null, token: '', expira: 0, lembrar: false, legado: false, appCarregado: false, logado: false, cadastroAberto: true };
  function lerGuardado() {
    for (const st of [sessionStorage, localStorage]) {
      try { const v = JSON.parse(st.getItem(K_SESSAO) || 'null'); if (v && v.token) return v; } catch {}
    }
    return null;
  }
  function guardar() {
    try { sessionStorage.removeItem(K_SESSAO); localStorage.removeItem(K_SESSAO); } catch {}
    if (!S.token) return;
    try { (S.lembrar ? localStorage : sessionStorage).setItem(K_SESSAO, JSON.stringify({ token: S.token, expira: S.expira, lembrar: S.lembrar, usuario: S.usuario })); } catch {}
  }
  async function definirSessao(sessao, usuario, lembrar) {
    if (sessao) { S.token = sessao.token; S.expira = sessao.expira; }
    if (usuario) S.usuario = usuario;
    if (lembrar !== undefined) S.lembrar = !!lembrar;
    guardar();
    try { await api.authSessao(S.token); } catch {}
  }
  const antigo = (r) => !!r && (r.codigo === 'semurl' || (!!r.versao && parseFloat(r.versao) < 2.4));
  const semRede = (r) => !!r && !r.ok && !r.versao && !r.codigo;

  const pode = (p) => S.legado || !!S.usuario?.permissoes?.includes(p);
  const podeTela = (v) => v === 'semacesso' || S.legado || (TELAS[v] || []).some(pode);
  const primeiraTela = () => Object.keys(TELAS).find(podeTela) || 'semacesso';
  const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || '?';
  const nomePerfil = (p) => (PERFIS[p] || PERFIS.personalizado).nome;
  function chipsPermissoes(u) {
    if (u.perfil === 'admin') return '<span class="perm-chip all">Acesso total</span>';
    const lista = PERMS.filter((p) => (u.permissoes || []).includes(p.id));
    return lista.length ? lista.map((p) => `<span class="perm-chip" title="${esc(p.dica)}">${esc(p.nome)}</span>`).join('') : '<span class="perm-chip off">Sem permissões</span>';
  }

  // ---------- esconder o que o usuário não pode ----------
  function aplicarPermissoes() {
    const h = document.documentElement;
    [...h.classList].filter((c) => c.startsWith('np-')).forEach((c) => h.classList.remove(c));
    PERMS.forEach((p) => { if (!pode(p.id)) h.classList.add('np-' + p.id.replace('.', '-')); });
    Object.keys(TELAS).forEach((t) => { if (!podeTela(t)) h.classList.add('np-tela-' + t); });
    h.classList.toggle('tem-login', !S.legado);
    const u = S.usuario;
    const chip = $('sbUser'), topo = $('mTopUser');
    if (chip) { chip.hidden = !u; if (u) chip.innerHTML = `<span class="avatar">${esc(iniciais(u.nome))}</span><div><strong>${esc(u.nome)}</strong><small>${esc(nomePerfil(u.perfil))}</small></div>`; }
    if (topo) { topo.hidden = !u; if (u) topo.textContent = iniciais(u.nome); }
  }

  // =========================================================
  //  MARCAÇÃO: tela de login, usuários, conta
  // =========================================================
  const cena = `
  <svg class="lg-scene" viewBox="0 0 360 300" role="img" aria-label="Malote de despacho">
    <path class="lg-route" d="M46 270 C 120 244, 240 296, 314 270" fill="none" stroke="#3a4c75" stroke-width="2.5"/>
    <g fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M40 272s-9-8-9-15a9 9 0 0 1 18 0c0 7-9 15-9 15z"/><circle cx="40" cy="257" r="3"/></g>
    <g class="lg-flag" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M316 274v-24"/><path d="M316 250h15l-3 5.5 3 5.5h-15"/></g>
    <ellipse class="lg-shadow" cx="180" cy="252" rx="92" ry="7" fill="#000" opacity=".38"/>
    <g class="lg-env">
      <rect x="70" y="88" width="220" height="140" rx="10" fill="var(--lg-paper-2)"/>
      <path class="lg-flap-open" d="M74 88 L180 14 L286 88 Z" fill="var(--lg-paper-2)" stroke="var(--lg-line)" stroke-width="1.5" stroke-linejoin="round"/>
      <g class="lg-letter">
        <rect x="90" y="40" width="180" height="118" rx="6" fill="#fff" stroke="#d5dded"/>
        <rect x="104" y="54" width="46" height="9" rx="2" fill="#2563eb"/>
        <rect x="104" y="72" width="152" height="4" rx="2" fill="#d5dded"/><rect x="104" y="82" width="120" height="4" rx="2" fill="#d5dded"/>
      </g>
      <path d="M70 98 a10 10 0 0 1 10 -10 h200 a10 10 0 0 1 10 10 v120 a10 10 0 0 1 -10 10 h-200 a10 10 0 0 1 -10 -10 z" fill="var(--lg-paper)"/>
      <path d="M72 226 L160 158 M288 226 L200 158" stroke="var(--lg-line)" stroke-width="1.5" opacity=".55" fill="none"/>
      <path d="M70 216 h220" stroke="#38bdf8" stroke-width="5" stroke-dasharray="14 14" opacity=".9"/>
      <path d="M84 216 h206" stroke="#a78bfa" stroke-width="5" stroke-dasharray="14 14" opacity=".9"/>
      <rect x="100" y="172" width="160" height="34" rx="5" fill="#fff" stroke="#d5dded"/>
      <text class="lg-ac-label" x="108" y="184">A/C</text>
      <text class="lg-ac" id="lgAC" x="108" y="199">&#8203;</text>
      <rect class="lg-caret" id="lgCaret" x="108" y="189" width="2" height="12"/>
      <path class="lg-flap-closed" d="M72 88 L180 164 L288 88 Z" fill="#f8faff" stroke="var(--lg-line)" stroke-width="1.5" stroke-linejoin="round"/>
      <g class="lg-seal" id="lgSeal">
        <circle cx="180" cy="160" r="19" fill="#2563eb"/><circle cx="180" cy="160" r="15" fill="none" stroke="#fff" stroke-opacity=".35"/>
        <g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><rect x="173" y="158" width="14" height="10" rx="2" fill="#fff"/><path d="M176 158v-3a4 4 0 0 1 8 0v3"/></g>
      </g>
      <g class="lg-stamp yes"><rect x="186" y="108" width="100" height="28" rx="5"/><text x="236" y="127" text-anchor="middle">LIBERADO</text></g>
      <g class="lg-stamp no"><rect x="186" y="108" width="100" height="28" rx="5"/><text x="236" y="127" text-anchor="middle">RECUSADO</text></g>
    </g>
  </svg>`;

  document.body.insertAdjacentHTML('beforeend', `
<div class="lgn" id="login" hidden data-modo="login">
  <div class="lg-card">
    <div class="lg-stage" aria-hidden="true">${cena}<div class="lg-caption" id="lgCaption"></div></div>
    <form class="lg-form" id="lgForm" novalidate>
      <img class="lg-logo" src="logo.png" alt="Grupo Quatro K">
      <h1 id="lgTitulo">Entrar</h1>
      <p class="lg-sub" id="lgSub"></p>
      <label class="field" data-only="primeiro"><span>Código de acesso (o do script do Google)</span><input id="lgCodigo" type="password" autocomplete="off" /></label>
      <label class="field" data-only="novo"><span>Seu nome</span><input id="lgNome" autocomplete="name" maxlength="60" placeholder="Como aparece nas minutas" /></label>
      <label class="field"><span>Usuário</span><input id="lgUsuario" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="30" /></label>
      <div class="field"><span>Senha</span>
        <div class="lg-pass"><input id="lgSenha" type="password" autocomplete="current-password" maxlength="100" aria-label="Senha" />
          <button class="lg-eye" id="lgOlho" type="button" aria-pressed="false" title="Mostrar a senha">${ico('eye')}</button></div>
        <span class="lg-caps" id="lgCaps" hidden>Caps Lock está ligado</span>
      </div>
      <label class="field" data-only="novo"><span>Repita a senha</span><input id="lgSenha2" type="password" autocomplete="new-password" maxlength="100" /></label>
      <label class="lg-keep"><input type="checkbox" id="lgLembrar" /> Manter conectado neste aparelho</label>
      <button class="primary lg-go" id="lgEntrar" type="submit">Entrar</button>
      <p class="lg-msg" id="lgMsg" role="alert"></p>
      <button class="lg-link" id="lgTrocar" type="button">Não tem usuário? Peça seu cadastro</button>
    </form>
  </div>
</div>

<div class="modal" id="mConta" aria-hidden="true"><div class="mbox sm-box" role="dialog" aria-modal="true" aria-labelledby="contaTitulo">
  <div class="m-head"><h3 id="contaTitulo">Minha conta</h3><button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button></div>
  <div class="m-body">
    <div class="conta-head"><span class="avatar lg-av" id="contaAvatar"></span><div><strong id="contaNome"></strong><small id="contaSub"></small></div></div>
    <span class="sub-title">O que você pode fazer</span>
    <div class="perm-chips" id="contaPerms"></div>
    <div class="conta-sep"></div>
    <span class="sub-title">Trocar senha</span>
    <div class="fgrid">
      <label class="field span2"><span>Senha atual</span><input id="contaAtual" type="password" autocomplete="current-password" /></label>
      <label class="field"><span>Nova senha</span><input id="contaNova" type="password" autocomplete="new-password" /></label>
      <label class="field"><span>Repita a nova senha</span><input id="contaNova2" type="password" autocomplete="new-password" /></label>
    </div>
    <p class="hint">Mínimo de 6 caracteres. Trocar a senha encerra a sessão nos outros aparelhos.</p>
  </div>
  <div class="m-foot"><button class="ghost sair-btn" id="btnSair" type="button">Sair</button><button class="primary" id="btnTrocarSenha" type="button">Trocar senha</button></div>
</div></div>

<div class="modal" id="mUsuario" aria-hidden="true"><div class="mbox lg" role="dialog" aria-modal="true" aria-labelledby="usTitulo">
  <div class="m-head"><h3 id="usTitulo">Novo usuário</h3><button class="ghost sm icon-btn" data-close type="button" title="Fechar" data-ico="close"><span class="sr">Fechar</span></button></div>
  <div class="m-body">
    <div class="fgrid">
      <label class="field"><span>Usuário (para entrar)</span><input id="usUsuario" autocapitalize="none" spellcheck="false" maxlength="30" placeholder="ex.: maria.silva" /></label>
      <label class="field"><span>Nome</span><input id="usNome" maxlength="60" placeholder="Como aparece nas minutas" /></label>
      <label class="field"><span id="usSenhaRotulo">Senha</span><input id="usSenha" type="password" autocomplete="new-password" maxlength="100" /></label>
      <div class="field"><span>Situação</span><div class="chips-check"><label><input type="checkbox" id="usAtivo" checked /><span>Usuário ativo (pode entrar)</span></label></div></div>
    </div>
    <span class="sub-title" style="margin-top:16px">Perfil</span>
    <div class="perfil-grid" id="usPerfis"></div>
    <div class="perm-box" id="usPermBox">
      <span class="sub-title">Pode acessar</span><div class="chips-check" id="usAcessar"></div>
      <span class="sub-title">Pode alterar</span><div class="chips-check" id="usAlterar"></div>
      <p class="hint" id="usPermDica"></p>
    </div>
  </div>
  <div class="m-foot"><button class="ghost" data-close type="button">Cancelar</button><button class="primary" id="usSalvar" type="button">Salvar usuário</button></div>
</div></div>`);

  // Tela "Usuários", tela "sem acesso", item do menu e o chip do usuário logado.
  document.querySelector('main.content')?.insertAdjacentHTML('beforeend', `
    <section id="v-usuarios" class="view">
      <header class="vh">
        <div class="vh-title"><div><span class="eyebrow">Sistema</span><h2>Usuários</h2></div></div>
        <div class="vh-actions"><button class="primary" id="btnNovoUsuario" type="button" data-ico="plus"><span>Novo usuário</span></button></div>
      </header>
      <div class="note" id="usSemLogin" data-ico="info" hidden><span>O login de usuários ainda não está ativo neste aparelho. Vincule abaixo o script do Google (versão 2.4 ou mais nova) e abra o Gerador de novo para criar o administrador.</span></div>
      <section class="card" id="usCardLista">
        <div class="card-h"><h3 data-ico="users">Quem pode entrar <span class="section-counter" id="usContador"></span></h3></div>
        <p class="hint">Cada pessoa entra com o próprio usuário e senha. O perfil define o que ela pode acessar e alterar.</p>
        <div class="us-list" id="usLista"></div>
      </section>
    </section>
    <section id="v-semacesso" class="view">
      <section class="card"><div class="us-empty"><p><b>Seu usuário ainda não tem nenhuma tela liberada.</b></p><p>Peça ao administrador para definir suas permissões.</p></div></section>
    </section>`);
  document.querySelector('.sb-nav [data-go="config"]')?.insertAdjacentHTML('afterend', '<button class="nav" data-go="usuarios" data-ico="users"><span>Usuários</span><b class="nav-badge" id="usBadge" hidden></b></button>');
  document.querySelector('.sb-foot')?.insertAdjacentHTML('afterbegin', '<button class="sb-user" id="sbUser" type="button" title="Minha conta" hidden></button>');
  document.querySelector('.m-top')?.insertAdjacentHTML('beforeend', '<button class="m-top-btn m-user" id="mTopUser" type="button" title="Minha conta" hidden></button>');
  document.querySelector('#cfgSheetsToken')?.closest('label')?.classList.add('campo-codigo');
  // O vínculo com o script do Google fica na tela de Usuários (só o administrador mexe).
  const cardSheets = $('cardSheets');
  if (cardSheets) {
    $('v-usuarios').appendChild(cardSheets);
    cardSheets.classList.remove('span-all'); cardSheets.classList.add('us-vinculo');
    const h = cardSheets.querySelector('.card-h h3'); if (h) h.lastChild.textContent = 'Vínculo com o Google Sheets';
    $('btnSheetsTestar')?.insertAdjacentHTML('beforebegin', '<button class="primary" id="btnSheetsSalvar" type="button" data-ico="save"><span>Salvar vínculo</span></button>');
    $('btnSheetsSalvar')?.addEventListener('click', () => $('salvarCfg')?.click());
  }
  window.hidratarIcones?.();

  // =========================================================
  //  TELA DE LOGIN
  // =========================================================
  const lg = $('login'), splash = $('splashScreen');
  const estadoCena = (cls, on) => lg.classList.toggle(cls, on);
  const legenda = (t) => { $('lgCaption').textContent = t; };
  function saudacao() { const h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function mensagem(t, info) { const m = $('lgMsg'); m.textContent = t || ''; m.classList.toggle('info', !!info); }

  function mostrarLogin(modo, aviso) {
    lg.dataset.modo = modo;
    const primeiro = modo === 'primeiro', cadastro = modo === 'cadastro';
    $('lgTitulo').textContent = primeiro ? 'Primeiro acesso' : cadastro ? 'Pedir cadastro' : saudacao() + '!';
    $('lgSub').textContent = primeiro
      ? 'Crie o usuário administrador. Ele cadastra as outras pessoas e define o que cada uma pode fazer.'
      : cadastro ? 'Escolha seu usuário e sua senha. Você entra assim que o administrador aprovar o cadastro.'
      : 'Entre com seu usuário para abrir o Gerador de Minutas.';
    $('lgEntrar').textContent = primeiro ? 'Criar administrador e entrar' : cadastro ? 'Enviar cadastro' : 'Entrar';
    $('lgSenha').autocomplete = primeiro || cadastro ? 'new-password' : 'current-password';
    $('lgTrocar').textContent = cadastro ? 'Já tenho usuário: entrar' : 'Não tem usuário? Peça seu cadastro';
    $('lgTrocar').hidden = primeiro || (!cadastro && !S.cadastroAberto);
    legenda(primeiro ? 'O malote espera o primeiro administrador.' : cadastro ? 'Seu cadastro segue para o administrador aprovar.' : 'Escreva seu usuário: ele vai no A/C do malote.');
    mensagem(aviso || '', true);
    lg.classList.remove('is-ok', 'is-go', 'is-error', 'is-busy');
    $('lgEntrar').disabled = false;
    lg.hidden = false;
    splash?.classList.add('is-hidden');
    setTimeout(() => (primeiro ? $('lgCodigo') : cadastro ? $('lgNome') : ($('lgUsuario').value ? $('lgSenha') : $('lgUsuario'))).focus(), 80);
  }
  $('lgTrocar').addEventListener('click', () => { if (!lg.classList.contains('is-busy')) mostrarLogin(lg.dataset.modo === 'cadastro' ? 'login' : 'cadastro'); });

  // O malote reage: A/C recebe o usuário, a aba fecha na senha, o lacre pulsa a cada tecla.
  const campoUsuario = $('lgUsuario'), campoSenha = $('lgSenha');
  function escreverAC() {
    const t = campoUsuario.value.trim().toUpperCase().slice(0, 17);
    const el = $('lgAC'); el.textContent = t || '​';
    let w = 0; try { w = t ? el.getComputedTextLength() : 0; } catch {}
    $('lgCaret').setAttribute('x', String(109 + w));
  }
  campoUsuario.addEventListener('input', () => { escreverAC(); lg.classList.remove('is-error'); });
  campoUsuario.addEventListener('focus', () => { estadoCena('is-user', true); legenda('Escreva seu usuário: ele vai no A/C do malote.'); });
  campoUsuario.addEventListener('blur', () => estadoCena('is-user', false));
  const senhas = [campoSenha, $('lgSenha2'), $('lgCodigo')];
  senhas.forEach((c) => {
    c.addEventListener('focus', () => { estadoCena('is-pass', true); legenda(lg.classList.contains('is-peek') ? 'Senha à mostra: confira se ninguém está olhando.' : 'Malote lacrado. Ninguém vê a sua senha.'); });
    c.addEventListener('blur', () => setTimeout(() => { if (!senhas.includes(document.activeElement) && document.activeElement !== $('lgOlho') && !lg.classList.contains('is-busy')) estadoCena('is-pass', false); }, 60));
    c.addEventListener('input', () => {
      lg.classList.remove('is-error');
      const s = $('lgSeal'); s.classList.remove('pulse'); void s.getBoundingClientRect(); s.classList.add('pulse');
    });
    c.addEventListener('keyup', (e) => { if (e.getModifierState) $('lgCaps').hidden = !e.getModifierState('CapsLock'); });
  });
  $('lgOlho').addEventListener('click', () => {
    const ver = campoSenha.type === 'password';
    campoSenha.type = ver ? 'text' : 'password';
    $('lgOlho').setAttribute('aria-pressed', String(ver));
    $('lgOlho').title = ver ? 'Esconder a senha' : 'Mostrar a senha';
    estadoCena('is-peek', ver); estadoCena('is-pass', true);
    legenda(ver ? 'Senha à mostra: confira se ninguém está olhando.' : 'Malote lacrado. Ninguém vê a sua senha.');
    campoSenha.focus();
  });

  // O malote inclina acompanhando o ponteiro.
  (function inclinar() {
    const palco = lg.querySelector('.lg-card'), svg = lg.querySelector('.lg-scene');
    let alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;
    function passo() {
      x += (alvoX - x) * 0.12; y += (alvoY - y) * 0.12;
      svg.style.setProperty('--ry', x.toFixed(2) + 'deg'); svg.style.setProperty('--rx', y.toFixed(2) + 'deg');
      if (Math.abs(alvoX - x) > 0.05 || Math.abs(alvoY - y) > 0.05) requestAnimationFrame(passo); else rodando = false;
    }
    const mover = (ax, ay) => { alvoX = ax; alvoY = ay; if (!rodando) { rodando = true; requestAnimationFrame(passo); } };
    palco.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || semMovimento()) return;
      const r = palco.getBoundingClientRect();
      mover(((e.clientX - r.left) / r.width - 0.5) * 22, -((e.clientY - r.top) / r.height - 0.5) * 16);
    });
    palco.addEventListener('pointerleave', () => mover(0, 0));
  })();

  function erroLogin(texto, foco) {
    mensagem(texto);
    legenda('Não deu para liberar o malote.');
    lg.classList.remove('is-busy', 'is-error'); void lg.offsetWidth; lg.classList.add('is-error');
    $('lgEntrar').disabled = false;
    setTimeout(() => lg.classList.remove('is-error'), 2200);
    (foco || campoSenha).focus(); (foco || campoSenha).select?.();
  }

  $('lgForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (lg.classList.contains('is-busy') || lg.classList.contains('is-ok')) return;
    const primeiro = lg.dataset.modo === 'primeiro', cadastro = lg.dataset.modo === 'cadastro';
    const usuario = campoUsuario.value.trim(), senha = campoSenha.value, lembrar = $('lgLembrar').checked;
    if (cadastro && !$('lgNome').value.trim()) return erroLogin('Digite o seu nome.', $('lgNome'));
    if (primeiro && !$('lgCodigo').value) return erroLogin('Digite o código de acesso definido no script do Google.', $('lgCodigo'));
    if (!usuario) return erroLogin('Digite o seu usuário.', campoUsuario);
    if (!senha) return erroLogin('Digite a sua senha.');
    if ((primeiro || cadastro) && senha.length < 6) return erroLogin('A senha precisa ter pelo menos 6 caracteres.');
    if ((primeiro || cadastro) && senha !== $('lgSenha2').value) return erroLogin('As duas senhas não são iguais.', $('lgSenha2'));

    mensagem(''); $('lgEntrar').disabled = true;
    lg.classList.add('is-busy', 'is-pass'); lg.classList.remove('is-peek');
    legenda('Conferindo com a planilha…');
    const r = primeiro
      ? await api.auth('auth.primeiro', { codigo: $('lgCodigo').value, usuario, nome: $('lgNome').value.trim(), senha, lembrar })
      : cadastro ? await api.auth('auth.cadastrar', { usuario, nome: $('lgNome').value.trim(), senha })
      : await api.auth('auth.login', { usuario, senha, lembrar });

    if (cadastro && r?.ok) {
      campoSenha.value = ''; $('lgSenha2').value = ''; $('lgNome').value = '';
      mostrarLogin('login', 'Cadastro enviado. Você poderá entrar assim que o administrador aprovar.');
      return legenda('Cadastro enviado para aprovação.');
    }

    if (r?.ok && r.sessao) {
      await definirSessao(r.sessao, r.usuario, lembrar);
      S.legado = false; S.logado = true;
      lg.classList.remove('is-busy'); lg.classList.add('is-ok');
      legenda('Acesso liberado. Boa expedição, ' + (r.usuario.nome || usuario).split(' ')[0] + '!');
      campoSenha.value = ''; $('lgSenha2').value = ''; $('lgCodigo').value = '';
      if (!semMovimento()) { await espera(520); lg.classList.add('is-go'); await espera(640); }
      return entrar();
    }
    if (antigo(r)) return entrarSemLogin(r.codigo === 'semurl' ? '' : 'antigo');
    if (r?.codigo === 'primeiro') { lg.classList.remove('is-busy'); return mostrarLogin('primeiro', 'Ainda não existe nenhum usuário. Crie o administrador.'); }
    if (r?.codigo === 'fechado') { S.cadastroAberto = false; lg.classList.remove('is-busy'); return mostrarLogin('login', r.error); }
    if (r?.codigo === 'existe' && primeiro) { lg.classList.remove('is-busy'); return mostrarLogin('login', 'O administrador já foi criado. Entre com usuário e senha.'); }
    erroLogin(semRede(r) ? 'Sem conexão com o Google. Confira a internet e tente de novo.' : (r?.error || 'Não foi possível entrar.'),
      r?.codigo === 'codigo' ? $('lgCodigo') : (r?.codigo === 'usuario' || r?.codigo === 'existe') ? campoUsuario : null);
  });

  // =========================================================
  //  ENTRAR NO APP
  // =========================================================
  function carregarApp() {
    if (S.appCarregado) return;
    S.appCarregado = true;
    const s = document.createElement('script'); s.src = APP_SRC;
    s.onerror = () => { S.appCarregado = false; splash?.classList.add('is-hidden'); mostrarLogin('login', 'Não foi possível carregar o aplicativo. Confira a internet e recarregue a página.'); };
    document.body.appendChild(s);
  }
  function entrar() {
    // Já estava com o app aberto (sessão vencida no meio do uso): recarrega para começar limpo.
    if (S.appCarregado) return location.reload();
    aplicarPermissoes();
    const st = $('splashStatus'); if (st) st.textContent = 'Inicializando sistema';
    splash?.classList.remove('is-hidden');
    lg.hidden = true;
    carregarApp();
    setTimeout(() => window.verificarPlanilhaUI?.(), 1500);
    setTimeout(avisarPendentes, 5000);
  }
  // Script do Google antigo (ou programa do Windows sem Google): funciona como antes, sem login.
  function entrarSemLogin(motivo) {
    S.legado = true; S.usuario = null; S.token = ''; S.logado = false;
    entrar();
    if (motivo === 'antigo') setTimeout(() => window.toast?.('Para ativar o login de usuários, publique a versão 2.4 do GoogleSheets_Script.gs no Apps Script.', true), 4500);
  }

  function sessaoEncerrada(aviso) {
    if (!S.logado) return;
    S.logado = false; S.token = ''; guardar();
    try { api.authSessao(''); } catch {}
    document.querySelectorAll('.modal.open').forEach((m) => window.fecharModal?.(m));
    campoUsuario.value = S.usuario?.usuario || ''; escreverAC();
    mostrarLogin('login', aviso || 'Sua sessão terminou. Entre de novo para continuar.');
  }
  async function sair() {
    S.token = ''; S.usuario = null; S.logado = false; guardar();
    try { localStorage.removeItem('gm_web_hist_cache'); } catch {}
    try { await api.authSessao(''); } catch {}
    location.reload();
  }

  // Confere a sessão de tempos em tempos: permissões alteradas pelo administrador valem sem precisar sair.
  let ultimaConferencia = 0;
  async function conferirSessao(forcar) {
    if (!S.logado || (!forcar && Date.now() - ultimaConferencia < 60000)) return;
    ultimaConferencia = Date.now();
    if (S.expira && S.expira < Date.now()) return sessaoEncerrada();
    const r = await api.auth('auth.eu');
    if (r?.ok && r.usuario) {
      const antes = JSON.stringify(S.usuario);
      await definirSessao(r.sessao || null, r.usuario);
      if (antes !== JSON.stringify(S.usuario)) { aplicarPermissoes(); const tela = document.body.dataset.screen; if (tela && !podeTela(tela)) window.go?.(primeiraTela()); }
    } else if (r?.codigo === 'login') sessaoEncerrada();
  }
  setInterval(() => conferirSessao(true), 5 * 60 * 1000);
  window.addEventListener('focus', () => conferirSessao(false));
  window.addEventListener('gm-sessao-encerrada', () => sessaoEncerrada());

  // =========================================================
  //  MINHA CONTA
  // =========================================================
  function abrirConta() {
    const u = S.usuario; if (!u) return;
    $('contaAvatar').textContent = iniciais(u.nome);
    $('contaNome').textContent = u.nome;
    $('contaSub').textContent = '@' + u.usuario + ' · ' + nomePerfil(u.perfil);
    $('contaPerms').innerHTML = chipsPermissoes(u);
    ['contaAtual', 'contaNova', 'contaNova2'].forEach((id) => ($(id).value = ''));
    window.abrirModal?.($('mConta'));
  }
  $('sbUser').addEventListener('click', abrirConta);
  $('mTopUser').addEventListener('click', abrirConta);
  $('btnSair').addEventListener('click', sair);
  $('btnTrocarSenha').addEventListener('click', async () => {
    const atual = $('contaAtual').value, nova = $('contaNova').value;
    if (!atual || !nova) return window.toast('Preencha a senha atual e a nova senha.', true);
    if (nova.length < 6) return window.toast('A nova senha precisa ter pelo menos 6 caracteres.', true);
    if (nova !== $('contaNova2').value) return window.toast('As duas senhas novas não são iguais.', true);
    const b = $('btnTrocarSenha'); b.disabled = true;
    const r = await api.auth('auth.senha', { atual, nova });
    b.disabled = false;
    if (!r?.ok) return window.toast(r?.error || 'Não foi possível trocar a senha.', true);
    await definirSessao(r.sessao, r.usuario);
    window.fecharModal($('mConta'));
    window.toast('Senha trocada.');
  });

  // =========================================================
  //  USUÁRIOS (para quem pode gerenciar)
  // =========================================================
  let usuarios = [], editando = null;
  async function renderUsuarios() {
    const box = $('usLista');
    try { await window.renderCfg?.(); } catch {} // preenche os campos do vínculo com o Google
    $('usSemLogin').hidden = !S.legado; $('usCardLista').hidden = S.legado; $('btnNovoUsuario').hidden = S.legado;
    if (S.legado) return;
    if (!usuarios.length) box.innerHTML = '<div class="us-empty">Carregando usuários…</div>';
    const r = await api.auth('usuarios.listar');
    if (!r?.ok) { box.innerHTML = `<div class="us-empty">${esc(r?.error || 'Não foi possível carregar os usuários.')}</div>`; return; }
    usuarios = (r.usuarios || []).slice().sort((a, b) => (b.pendente ? 1 : 0) - (a.pendente ? 1 : 0));
    marcarPendentes(usuarios.filter((u) => u.pendente).length);
    $('usContador').textContent = usuarios.length + (usuarios.length === 1 ? ' usuário' : ' usuários');
    box.innerHTML = usuarios.map((u) => {
      const eu = u.usuario === S.usuario?.usuario;
      if (u.pendente) return `<div class="us-row pend">
        <div class="us-who"><span class="avatar">${esc(iniciais(u.nome))}</span><div><strong>${esc(u.nome)}</strong><small>@${esc(u.usuario)}</small></div></div>
        <div><span class="perm-chip wait">Aguardando aprovação</span></div>
        <div class="us-last">Pediu o cadastro pela tela de login <b>${esc(u.criadoEm || '')}</b></div><div></div>
        <div class="us-actions act"><button type="button" class="ok" data-us-editar="${esc(u.usuario)}" title="Aprovar e escolher o perfil">${ico('check')}<span>Aprovar</span></button><button type="button" class="del" data-us-excluir="${esc(u.usuario)}" title="Recusar o cadastro">${ico('trash')}</button></div>
      </div>`;
      return `<div class="us-row${u.ativo ? '' : ' off'}">
        <div class="us-who"><span class="avatar">${esc(iniciais(u.nome))}</span><div><strong>${esc(u.nome)}${eu ? ' (você)' : ''}</strong><small>@${esc(u.usuario)}${u.ativo ? '' : ' · desativado'}</small></div></div>
        <div><span class="perm-chip${u.perfil === 'admin' ? ' all' : ''}">${esc(nomePerfil(u.perfil))}</span></div>
        <div class="perm-chips">${chipsPermissoes(u)}</div>
        <div class="us-last">Último acesso <b>${esc(u.ultimoAcesso || 'nunca entrou')}</b></div>
        <div class="us-actions act"><button type="button" data-us-editar="${esc(u.usuario)}" title="Alterar usuário">${ico('edit')}<span>Alterar</span></button>${eu ? '' : `<button type="button" class="del" data-us-excluir="${esc(u.usuario)}" title="Excluir usuário">${ico('trash')}</button>`}</div>
      </div>`;
    }).join('') || '<div class="us-empty">Nenhum usuário.</div>';
  }
  function marcarPendentes(n) { const b = $('usBadge'); if (b) { b.hidden = !n; b.textContent = n ? String(n) : ''; } }
  async function avisarPendentes() {
    if (S.legado || !pode('usuarios.gerenciar')) return;
    const r = await api.auth('usuarios.listar'); if (!r?.ok) return;
    const n = (r.usuarios || []).filter((u) => u.pendente).length; marcarPendentes(n);
    if (n) window.toast?.(n === 1 ? 'Há 1 cadastro aguardando sua aprovação em Usuários.' : `Há ${n} cadastros aguardando sua aprovação em Usuários.`);
  }
  $('usLista').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-us-editar]'), ex = e.target.closest('[data-us-excluir]');
    if (ed) return abrirUsuario(usuarios.find((u) => u.usuario === ed.dataset.usEditar));
    if (!ex) return;
    const u = usuarios.find((x) => x.usuario === ex.dataset.usExcluir); if (!u) return;
    const ok = await window.confirmarAcaoCorporativa(u.pendente
      ? { titulo: 'Recusar cadastro', mensagem: `Recusar o cadastro de ${esc(u.nome)} (@${esc(u.usuario)})?`, detalhe: 'O pedido é apagado. A pessoa pode pedir de novo.', confirmacao: 'Recusar cadastro', tipo: 'danger' }
      : { titulo: 'Excluir usuário', mensagem: `Excluir o usuário ${esc(u.nome)} (@${esc(u.usuario)})?`, detalhe: 'Ele deixa de conseguir entrar na hora. As minutas que ele registrou continuam na planilha.', confirmacao: 'Excluir usuário', tipo: 'danger' });
    if (!ok) return;
    const r = await api.auth('usuarios.excluir', { usuario: u.usuario });
    if (!r?.ok) return window.toast(r?.error || 'Não foi possível excluir o usuário.', true);
    window.toast(u.pendente ? 'Cadastro recusado.' : 'Usuário excluído.'); renderUsuarios();
  });

  // Editor
  $('usPerfis').innerHTML = Object.entries(PERFIS).map(([id, p]) => `<label class="radio-card"><input type="radio" name="usPerfil" value="${id}" /><span><b>${p.nome}</b><small>${p.dica}</small></span></label>`).join('');
  const caixaPerm = (p) => `<label title="${esc(p.dica)}"><input type="checkbox" data-perm="${p.id}" /><span>${esc(p.nome)}</span></label>`;
  $('usAcessar').innerHTML = PERMS.filter((p) => p.grupo === 'acessar').map(caixaPerm).join('');
  $('usAlterar').innerHTML = PERMS.filter((p) => p.grupo === 'alterar').map(caixaPerm).join('');
  const caixas = () => [...$('usPermBox').querySelectorAll('[data-perm]')];
  const perfilMarcado = () => document.querySelector('input[name="usPerfil"]:checked')?.value || 'operador';
  function marcar(lista) { caixas().forEach((c) => (c.checked = lista.includes(c.dataset.perm))); }
  function atualizarPerfil() {
    const perfil = perfilMarcado(), preset = PERFIS[perfil].perms;
    if (preset) marcar(preset);
    $('usPermBox').classList.toggle('locked', !!preset);
    caixas().forEach((c) => (c.disabled = !!preset));
    $('usPermDica').textContent = preset ? 'Estas são as permissões do perfil ' + PERFIS[perfil].nome + '. Para marcar uma a uma, escolha Personalizado.' : 'Marque o que esta pessoa pode acessar e alterar. Quem altera ou exclui minutas também vê o histórico.';
  }
  $('usPerfis').addEventListener('change', atualizarPerfil);
  $('usPermBox').addEventListener('change', (e) => {
    const c = e.target.closest('[data-perm]'); if (!c) return;
    const hist = caixas().find((x) => x.dataset.perm === 'historico.ver');
    if (['minutas.editar', 'minutas.excluir'].includes(c.dataset.perm) && c.checked) hist.checked = true;
    if (c === hist && !c.checked) caixas().forEach((x) => { if (['minutas.editar', 'minutas.excluir'].includes(x.dataset.perm)) x.checked = false; });
  });
  function abrirUsuario(u) {
    editando = u || null;
    $('usTitulo').textContent = u?.pendente ? 'Aprovar cadastro' : u ? 'Alterar usuário' : 'Novo usuário';
    $('usSalvar').textContent = u?.pendente ? 'Aprovar e salvar' : 'Salvar usuário';
    $('usUsuario').value = u?.usuario || ''; $('usUsuario').readOnly = !!u;
    $('usNome').value = u?.nome || ''; $('usSenha').value = '';
    $('usSenhaRotulo').innerHTML = u ? 'Nova senha <i>(em branco mantém a atual)</i>' : 'Senha <i>(mínimo 6 caracteres)</i>';
    $('usAtivo').checked = u ? (u.ativo || u.pendente) : true;
    $('usAtivo').disabled = !!u && u.usuario === S.usuario?.usuario;
    const perfil = u?.pendente ? 'operador' : (u?.perfil || 'operador');
    document.querySelectorAll('input[name="usPerfil"]').forEach((r) => (r.checked = r.value === perfil));
    marcar(u?.permissoes || []);
    atualizarPerfil();
    window.abrirModal($('mUsuario'));
    setTimeout(() => (u ? $('usNome') : $('usUsuario')).focus(), 60);
  }
  $('btnNovoUsuario').addEventListener('click', () => abrirUsuario(null));
  $('usSalvar').addEventListener('click', async () => {
    const dados = { usuario: $('usUsuario').value.trim().toLowerCase(), nome: $('usNome').value.trim(), perfil: perfilMarcado(), permissoes: caixas().filter((c) => c.checked).map((c) => c.dataset.perm), ativo: $('usAtivo').checked };
    const senha = $('usSenha').value;
    if (!dados.usuario) return window.toast('Informe o usuário.', true);
    if (!editando && !senha) return window.toast('Defina uma senha para o novo usuário.', true);
    if (senha && senha.length < 6) return window.toast('A senha precisa ter pelo menos 6 caracteres.', true);
    if (senha) dados.senha = senha;
    const b = $('usSalvar'); b.disabled = true;
    const r = await api.auth('usuarios.salvar', { novo: !editando, usuario: dados });
    b.disabled = false;
    if (!r?.ok) return window.toast(r?.error || 'Não foi possível salvar o usuário.', true);
    window.fecharModal($('mUsuario'));
    window.toast(editando?.pendente && dados.ativo ? 'Cadastro aprovado. A pessoa já pode entrar.' : editando ? 'Usuário alterado.' : 'Usuário criado. Passe o usuário e a senha para a pessoa.');
    if (r.usuario?.usuario === S.usuario?.usuario) conferirSessao(true);
    renderUsuarios();
  });

  window.AUTH = { pode, podeTela, primeiraTela, renderUsuarios, sair, get usuario() { return S.usuario; }, get legado() { return S.legado; } };

  // =========================================================
  //  INÍCIO
  // =========================================================
  (async function iniciar() {
    if (!api || !api.auth) return entrarSemLogin('');
    const g = lerGuardado();
    if (g && g.expira > Date.now()) {
      S.usuario = g.usuario || null; S.lembrar = !!g.lembrar;
      await definirSessao({ token: g.token, expira: g.expira });
      const r = await api.auth('auth.eu');
      if (r?.ok && r.usuario) { await definirSessao(r.sessao || null, r.usuario); S.logado = true; ultimaConferencia = Date.now(); return entrar(); }
      if (antigo(r)) return entrarSemLogin(r.codigo === 'semurl' ? '' : 'antigo');
      // Sem internet com sessão ainda válida: abre com o que estava guardado (o Google confere de novo quando voltar).
      if (semRede(r) && S.usuario) { S.logado = true; return entrar(); }
      S.token = ''; guardar(); try { await api.authSessao(''); } catch {}
      campoUsuario.value = g.usuario?.usuario || ''; escreverAC();
      return mostrarLogin('login', 'Sua sessão terminou. Entre de novo para continuar.');
    }
    const r = await api.auth('auth.estado');
    if (antigo(r)) return entrarSemLogin(r.codigo === 'semurl' ? '' : 'antigo');
    if (r?.ok && r.cadastro === false) S.cadastroAberto = false;
    if (r?.ok && !r.temUsuarios) return mostrarLogin('primeiro');
    mostrarLogin('login', semRede(r) ? 'Sem conexão com o Google no momento. Confira a internet.' : '');
  })();
})();
