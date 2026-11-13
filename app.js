const ICO = window.ICO || ((n) => '');
const DEFAULT_CFG = {
  proximo: 1, digitos: 6,
  impressao: { modelo:'cortesia', fonte:'Times New Roman', tamanho:12, titulo:14, alinhamento:'center', margem:16, espaco:8, textoTitulo:'FRETE CORTESIA – QUATRO K TÊXTIL LTDA', textoSubtitulo:'MALOTE INTERNO', peso:'bold', mostrarData:true, mostrarCnpj:false, mostrarIE:false, mostrarContato:false, mostrarTelefone:false, mostrarCep:true, mostrarNumero:true, mostrarDeclaracao:false, mostrarEmbalagem:false, mostrarVolumes:false },
  planilhaDir: 'U:\\Programação - ideias\\Minuta - Malote',
  remetente: { nome: 'QUATRO K TÊXTIL LTDA - ILHOTA', cnpj: '56.966.682/0014-60', ie: '256.110.069', endereco: 'RUA JOSÉ GERALDINO BITTENCOURT, 4001 Galpão 9 - PEDRA DE AMOLAR – ILHOTA/SC', numero: '', cep: '', complemento: '', telefone: '47 3343 0087', fax: '', contato: 'Kauê', centroCusto: '06003' },
  destinatario: { nome: 'QUATRO K TÊXTIL LTDA – SÃO CAETANO DO SUL', cnpj: '56.966.682/0001-46', ie: '', endereco: 'RUA PARAIBA ,276 CENTRO,', numero: '276', cep: '09521-070', complemento: '', telefone: '11 4174 3000', fax: '', contato: 'SHEILA - Recepção', centroCusto: '' },
};
const CAMPOS = [['nome', 'Nome/Razão Social', 2], ['cnpj', 'CNPJ/CPF'], ['ie', 'IE'], ['endereco', 'Endereço/Logradouro', 2], ['numero', 'Nº'], ['cep', 'CEP'], ['complemento', 'Complemento'], ['telefone', 'Telefone'], ['fax', 'Fax'], ['contato', 'Nome do Contato'], ['centroCusto', 'Centro de Custo']];

const $ = (id) => document.getElementById(id);
const hasApi = !!window.api;
let cfg = mesclarConfig(DEFAULT_CFG, null), hist = [], itens = [], embalagens = [], editIdx = -1, partes = { remetente: { ...DEFAULT_CFG.remetente }, destinatario: { ...DEFAULT_CFG.destinatario } }, editParte = null, modoRevisao = false;

function mesclarConfig(base, atual) {
  const origem = atual && typeof atual === 'object' ? atual : {};
  const mesclarParte = (padrao, salvo) => {
    const out = { ...(padrao || {}) };
    for (const [chave, valor] of Object.entries(salvo || {})) {
      // Campos vazios gravados por versões anteriores não podem apagar
      // os dados padrão já definidos no projeto.
      if (valor !== null && valor !== undefined && String(valor).trim() !== '') out[chave] = valor;
    }
    return out;
  };
  return {
    ...base,
    ...origem,
    planilhaDir: String(origem.planilhaDir || base.planilhaDir || '').trim(),
    remetente: mesclarParte(base.remetente, origem.remetente),
    destinatario: mesclarParte(base.destinatario, origem.destinatario),
  };
}

const store = {
  getConfig: async () => {
    try {
      return hasApi ? await api.getConfig() : JSON.parse(localStorage.cfg || 'null');
    } catch (e) {
      console.warn('Não foi possível carregar config.json; usando padrões.', e);
      return null;
    }
  },
  setConfig: async (c) => {
    try {
      return hasApi ? await api.setConfig(c) : (localStorage.cfg = JSON.stringify(c));
    } catch (e) {
      console.warn('Não foi possível salvar config.json.', e);
      return false;
    }
  },
  getHist: async () => {
    try {
      return hasApi ? (await api.getHistorico()) || [] : (JSON.parse(localStorage.hist || '[]') || []);
    } catch (e) {
      console.warn('Não foi possível carregar histórico; continuando sem histórico.', e);
      return [];
    }
  },
};

// ---------- Cadastro local de pessoas/setores para autocomplete ----------
const PESSOAS_KEY = 'minuta_pessoas_cadastro_v2';
let cadastroFiltro = 'todos';
let cadastroEdicao = -1;
function lerPessoasCadastradas() {
  try {
    const v = JSON.parse(localStorage.getItem(PESSOAS_KEY) || localStorage.getItem('minuta_pessoas_cadastro_v1') || '[]');
    return Array.isArray(v) ? v.filter(x => x && String(x.nome || '').trim()).map(x => ({
      nome: String(x.nome || '').trim(), rem: x.rem !== false, dest: x.dest !== false,
      obs: String(x.obs || '').trim(), atualizadoEm: x.atualizadoEm || new Date(0).toISOString()
    })) : [];
  } catch { return []; }
}
function salvarPessoasCadastradas(lista) {
  try { localStorage.setItem(PESSOAS_KEY, JSON.stringify(lista)); } catch {}
}
function normalizarNomeCadastro(v) { return String(v || '').trim().replace(/\s+/g, ' '); }
function iniciaisCadastro(nome) {
  const partes = normalizarNomeCadastro(nome).replace(/[-–—].*$/, '').trim().split(/\s+/).filter(Boolean);
  return (partes.slice(0,2).map(x => x[0]).join('') || '??').toUpperCase();
}
function adicionarPessoaCadastrada(nome, rem = true, dest = true, obs = '') {
  nome = normalizarNomeCadastro(nome); obs = String(obs || '').trim();
  if (!nome) return false;
  const lista = lerPessoasCadastradas();
  const idx = lista.findIndex(x => String(x.nome).toLowerCase() === nome.toLowerCase());
  const item = { nome, rem: !!rem, dest: !!dest, obs, atualizadoEm: new Date().toISOString() };
  if (idx >= 0) lista[idx] = { ...lista[idx], ...item }; else lista.unshift(item);
  salvarPessoasCadastradas(lista); return true;
}
function aprenderPessoaDoItem(nome, tipo) {
  nome = normalizarNomeCadastro(nome); if (!nome) return;
  const lista = lerPessoasCadastradas();
  const idx = lista.findIndex(x => String(x.nome).toLowerCase() === nome.toLowerCase());
  if (idx >= 0) { lista[idx][tipo] = true; lista[idx].atualizadoEm = new Date().toISOString(); salvarPessoasCadastradas(lista); }
  else adicionarPessoaCadastrada(nome, tipo === 'rem', tipo === 'dest');
}
function opcoesAutocomplete(tipo) {
  const cadastradas = lerPessoasCadastradas().filter(x => tipo === 'rem' ? x.rem !== false : x.dest !== false).map(x => x.nome);
  const historico = hist.flatMap(h => (h.itens || []).map(x => tipo === 'rem' ? x.pessoa : x.ref)).filter(Boolean).map(normalizarNomeCadastro);
  return [...new Set([...cadastradas, ...historico])].filter(Boolean).sort((a,b) => a.localeCompare(b, 'pt-BR'));
}
function atualizarAutocompletes() {
  const rem = opcoesAutocomplete('rem'), dest = opcoesAutocomplete('dest');
  $('pessoasList').innerHTML = rem.map(p => `<option value="${esc(p)}"></option>`).join('');
  $('destinosList').innerHTML = dest.map(p => `<option value="${esc(p)}"></option>`).join('');
}
function cadastroAtualizarTipoBotoes() {
  const rem = $('cadPessoaRem')?.checked, dest = $('cadPessoaDest')?.checked;
  document.querySelectorAll('.cad-type').forEach(b => b.classList.toggle('active', b.dataset.cadType === 'ambos' ? rem && dest : b.dataset.cadType === 'rem' ? rem : dest));
}
function cadastroAplicarTipo(tipo) {
  if (tipo === 'ambos') { $('cadPessoaRem').checked = true; $('cadPessoaDest').checked = true; }
  else if (tipo === 'rem') { $('cadPessoaRem').checked = true; $('cadPessoaDest').checked = false; }
  else { $('cadPessoaRem').checked = false; $('cadPessoaDest').checked = true; }
  cadastroAtualizarTipoBotoes();
}
function limparEditorCadastro() {
  cadastroEdicao = -1;
  $('cadPessoaNome').value = ''; $('cadPessoaObs').value = '';
  $('cadPessoaRem').checked = true; $('cadPessoaDest').checked = true;
  cadastroAtualizarTipoBotoes();
  $('cadPessoaSalvar').innerHTML = ICO('save') + '<span>Salvar</span>';
}
function editarCadastroPessoa(idx) {
  const p = lerPessoasCadastradas()[idx]; if (!p) return;
  cadastroEdicao = idx;
  $('cadPessoaNome').value = p.nome; $('cadPessoaObs').value = p.obs || '';
  $('cadPessoaRem').checked = p.rem !== false; $('cadPessoaDest').checked = p.dest !== false;
  cadastroAtualizarTipoBotoes(); $('cadPessoaSalvar').innerHTML = ICO('save') + '<span>Atualizar cadastro</span>';
  setTimeout(() => $('cadPessoaNome').focus(), 50);
}
function renderCadastroPessoas() {
  const box = $('cadPessoasLista'); if (!box) return;
  const busca = String($('cadPessoaBusca')?.value || '').trim().toLocaleLowerCase('pt-BR');
  let lista = lerPessoasCadastradas().map((p, original) => ({...p, _original: original}));
  lista = lista.filter(p => {
    const texto = `${p.nome} ${p.obs || ''}`.toLocaleLowerCase('pt-BR');
    if (busca && !texto.includes(busca)) return false;
    if (cadastroFiltro === 'rem' && !p.rem) return false;
    if (cadastroFiltro === 'dest' && !p.dest) return false;
    if (cadastroFiltro === 'ambos' && !(p.rem && p.dest)) return false;
    return true;
  });
  if (($('cadPessoaOrdenacao')?.value || 'recentes') === 'az') lista.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  $('cadPessoaCount').textContent = String(lerPessoasCadastradas().length);
  box.innerHTML = lista.length ? lista.map(p => `<div class="cadastro-item modern${p._original === cadastroEdicao ? ' selected' : ''}">
    <div class="cad-avatar">${esc(iniciaisCadastro(p.nome))}</div>
    <div class="cadastro-person modern"><strong>${esc(p.nome)}</strong><small>${esc(p.obs || '')}</small><div class="cad-tags">${p.rem ? '<span class="cad-tag rem">Rem.</span>' : ''}${p.dest ? '<span class="cad-tag dest">Dest.</span>' : ''}</div></div>
    <div class="cad-item-actions"><button class="cad-icon-btn" data-edit-cad="${p._original}" title="Editar">${ICO('edit')}</button><button class="cad-icon-btn danger" data-remove-cad="${p._original}" title="Excluir">${ICO('trash')}</button></div>
  </div>`).join('') : `<div class="cadastro-empty modern">${ICO('users')}<strong>Nenhum cadastro encontrado</strong><small>Tente outro termo ou clique em “Novo Cadastro”.</small></div>`;
  box.querySelectorAll('[data-edit-cad]').forEach(btn => btn.onclick = () => { editarCadastroPessoa(Number(btn.dataset.editCad)); renderCadastroPessoas(); });
  box.querySelectorAll('[data-remove-cad]').forEach(btn => btn.onclick = () => {
    const idx = Number(btn.dataset.removeCad), arr = lerPessoasCadastradas();
    if (!arr[idx]) return; arr.splice(idx, 1); salvarPessoasCadastradas(arr); if (cadastroEdicao === idx) limparEditorCadastro(); renderCadastroPessoas(); atualizarAutocompletes(); toast('Cadastro removido.');
  });
}
function abrirCadastroPessoas() {
  cadastroFiltro = 'todos'; document.querySelectorAll('.cad-filter').forEach(b => b.classList.toggle('active', b.dataset.cadFilter === 'todos'));
  limparEditorCadastro(); if ($('cadPessoaBusca')) $('cadPessoaBusca').value = '';
  renderCadastroPessoas(); abrirModal($('mCadastroPessoas')); setTimeout(() => $('cadPessoaBusca')?.focus(), 60);
}
function salvarCadastroPessoa() {
  const nome = normalizarNomeCadastro($('cadPessoaNome').value), rem = $('cadPessoaRem').checked, dest = $('cadPessoaDest').checked, obs = $('cadPessoaObs').value.trim();
  if (!nome) return toast('Informe o nome ou setor.', true);
  if (!rem && !dest) return toast('Selecione pelo menos um tipo de uso.', true);
  const lista = lerPessoasCadastradas();
  const idxNome = lista.findIndex(x => x.nome.toLowerCase() === nome.toLowerCase());
  const atual = { nome, rem, dest, obs, atualizadoEm: new Date().toISOString() };
  if (cadastroEdicao >= 0) {
    if (idxNome >= 0 && idxNome !== cadastroEdicao) return toast('Já existe um cadastro com esse nome.', true);
    lista[cadastroEdicao] = atual;
  } else if (idxNome >= 0) lista[idxNome] = atual;
  else lista.unshift(atual);
  salvarPessoasCadastradas(lista); atualizarAutocompletes(); renderCadastroPessoas();
  if (cadastroEdicao < 0) { toast('Pessoa/setor cadastrado.'); limparEditorCadastro(); renderCadastroPessoas(); }
  else { toast('Cadastro atualizado.'); cadastroEdicao = -1; $('cadPessoaSalvar').innerHTML = ICO('save') + '<span>Salvar</span>'; renderCadastroPessoas(); }
}

function toast(msg, err) { const t = $('toast'); t.textContent = msg; t.className = err ? 'err' : ''; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(() => (t.style.display = 'none'), 4000); }
const hoje = () => new Date().toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(cfg.digitos || 6, '0');

let telaAtual = 'nova';
function go(v) {
  let destino = document.getElementById('v-' + v) ? v : 'nova';
  // Controle de acesso: tela não liberada para o usuário vira a primeira tela que ele pode abrir.
  if (window.AUTH && !window.AUTH.podeTela(destino)) destino = window.AUTH.primeiraTela();
  telaAtual = destino;
  document.querySelectorAll('.view').forEach((e) => e.classList.toggle('active', e.id === 'v-' + destino));
  document.querySelectorAll('.nav').forEach((e) => e.classList.toggle('active', e.dataset.go === destino));
  document.body.dataset.screen = destino;
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (destino === 'historico') renderHist();
  if (destino === 'config') renderCfg();
  if (destino === 'usuarios') window.AUTH?.renderUsuarios?.();
}
document.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
function fecharModal(modal) {
  if (!modal) return;
  if (typeof modal._resolver === 'function') { const resolve = modal._resolver; modal._resolver = null; resolve(false); }
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}
function abrirModal(modal) {
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => fecharModal(b.closest('.modal'))));
document.querySelectorAll('.modal').forEach((modal) => {
  modal.addEventListener('mousedown', (e) => {
    if (e.target === modal) fecharModal(modal);
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = [...document.querySelectorAll('.modal.open')].pop();
  if (open) { e.preventDefault(); fecharModal(open); }
});

function confirmarAcaoCorporativa({
  titulo = 'Confirmar ação',
  mensagem = 'Deseja continuar com esta ação?',
  detalhe = '',
  confirmacao = 'Confirmar',
  tipo = 'warning',
} = {}) {
  const modal = $('mAcaoCorporativa');
  if (!modal) return Promise.resolve(false);
  $('actionEyebrow').textContent = tipo === 'danger' ? 'AÇÃO ADMINISTRATIVA' : 'CONFIRMAÇÃO';
  $('actionTitle').textContent = titulo;
  $('actionMessage').textContent = mensagem;
  $('actionDetail').textContent = detalhe;
  $('actionDetail').style.display = detalhe ? 'block' : 'none';
  const icon = $('actionIcon');
  icon.textContent = tipo === 'danger' ? '!' : '?';
  icon.className = `action-symbol ${tipo}`;
  const btnCancelar = $('btnCancelarAcao');
  const btnConfirmar = $('btnConfirmarAcao');
  btnConfirmar.textContent = confirmacao;
  btnConfirmar.className = tipo === 'danger' ? 'danger-primary' : 'primary action-primary';
  btnConfirmar.disabled = false;
  abrirModal(modal);
  return new Promise((resolve) => {
    modal._resolver = resolve;
    const limpar = () => {
      btnCancelar.onclick = null;
      btnConfirmar.onclick = null;
      if (modal._resolver === resolve) modal._resolver = null;
    };
    const cancelar = () => { limpar(); fecharModal(modal); resolve(false); };
    const confirmar = () => { limpar(); fecharModal(modal); resolve(true); };
    btnCancelar.onclick = cancelar;
    btnConfirmar.onclick = confirmar;
  });
}

function confirmarExclusaoMinuta(minuta) {
  const numero = String(minuta?.numero || '—');
  const pessoas = [...new Set((minuta?.itens || []).map((i) => i.pessoa).filter(Boolean))].join(', ') || 'Não informado';
  return confirmarAcaoCorporativa({
    titulo: 'Excluir minuta',
    mensagem: `A minuta N° ${numero} será excluída permanentemente do histórico.`,
    detalhe: `Dest. / Setor: ${pessoas}\nTodos os registros vinculados a esta minuta serão removidos da planilha. O número continuará reservado e não será reutilizado.`,
    confirmacao: 'Excluir minuta',
    tipo: 'danger',
  });
}

function confirmarExclusaoItem() {
  return confirmarAcaoCorporativa({
    titulo: 'Excluir item',
    mensagem: 'O item selecionado será removido da minuta atual.',
    detalhe: 'Esta ação altera somente a minuta que está sendo editada. Revise os itens antes de salvar.',
    confirmacao: 'Excluir item',
    tipo: 'danger',
  });
}

function confirmarNovaMinuta() {
  return confirmarAcaoCorporativa({
    titulo: 'Iniciar nova minuta',
    mensagem: 'Os dados da minuta atual serão limpos para iniciar uma nova.',
    detalhe: 'As informações ainda não salvas poderão ser perdidas.',
    confirmacao: 'Iniciar nova',
    tipo: 'warning',
  });
}

function confirmarContinuarSemItens() {
  return confirmarAcaoCorporativa({
    titulo: 'Nenhum item adicionado',
    mensagem: 'A minuta está sem itens do envio. Deseja continuar mesmo assim?',
    detalhe: 'Você poderá adicionar ou editar os itens antes de concluir a minuta.',
    confirmacao: 'Continuar',
    tipo: 'warning',
  });
}

function confirmarNovaAposSalvar() {
  return confirmarAcaoCorporativa({
    titulo: 'Minuta salva com sucesso',
    mensagem: 'A minuta foi registrada. Deseja iniciar uma nova minuta agora?',
    detalhe: 'A minuta salva permanecerá disponível no Histórico.',
    confirmacao: 'Nova minuta',
    tipo: 'success',
  });
}

function partyBox(p) {
  const f = (l, v) => `<div class="f"><small>${l}</small><div>${esc(v) || '-'}</div></div>`;
  return f('Nome/Razão Social', p.nome) + `<div class="two">${f('CNPJ/CPF', p.cnpj)}${f('IE', p.ie)}</div>` +
    f('Endereço/Logradouro', [p.endereco, p.numero && 'Nº ' + p.numero, p.cep && 'CEP: ' + p.cep].filter(Boolean).join(' – ')) +
    `<div class="two">${f('Telefone', p.telefone)}${f('Contato', p.contato)}</div><div class="two">${f('Complemento / Fax', [p.complemento, p.fax].filter(Boolean).join(' / '))}${f('Centro de Custo', p.centroCusto)}</div>`;
}
function partySummary(p) {
  const nome = esc(p.nome) || 'Não informado';
  const contato = esc(p.contato) || 'Sem contato informado';
  const cidade = esc([p.endereco, p.numero].filter(Boolean).join(', ')) || 'Endereço não informado';
  return `<strong>${nome}</strong><span>${contato}</span><span>${cidade}</span>`;
}


function renderPartes() {
  $('box-remetente').innerHTML = partyBox(partes.remetente);
  $('box-destinatario').innerHTML = partyBox(partes.destinatario);
  $('summary-remetente').innerHTML = partySummary(partes.remetente);
  $('summary-destinatario').innerHTML = partySummary(partes.destinatario);
  document.querySelectorAll('.party-toggle').forEach((b) => {
    const target = $('box-' + b.dataset.partyToggle);
    const expanded = b.getAttribute('aria-expanded') === 'true';
    b.innerHTML = expanded ? ICO('chevron','rot') + '<span>Ocultar</span>' : ICO('chevron') + '<span>Detalhes</span>';
    if (target) target.hidden = !expanded;
  });
}

function partyForm(prefix, p, title) {
  return (title ? `<div class="ch"><span class="pin">📍 ${title}</span></div>` : '') + '<div class="row r2">' +
    CAMPOS.map(([k, l, span]) => `<label ${span ? 'style="grid-column:span 2"' : ''}>${l}<input data-f="${prefix}.${k}" value="${esc(p[k])}"></label>`).join('') + '</div>';
}
function readForm(root, prefix) { const o = {}; root.querySelectorAll(`[data-f^="${prefix}."]`).forEach((i) => (o[i.dataset.f.split('.')[1]] = i.value.trim())); return o; }

// ---------- Itens ----------
function renderItens() {
  $('itensBody').innerHTML = itens.map((it, i) => `<tr><td><span class="item-index">${i + 1}</span></td><td>${esc(it.pessoa)}</td><td>${esc(it.ref)}</td><td>${esc(it.qtd)}</td><td><span class="content-tag">${esc(it.conteudo)}</span></td><td>${esc(it.obs) || '<span class="muted-cell">—</span>'}</td>
    <td class="act"><button title="Editar" data-e="${i}">${ICO('edit')}</button><button title="Duplicar" data-c="${i}">${ICO('copy')}</button><button class="del" title="Excluir" data-d="${i}">${ICO('trash')}</button></td></tr>`).join('');
  $('empty').style.display = itens.length ? 'none' : 'flex';
  const volumes = itens.reduce((n, it) => n + (Math.max(1, parseInt(it.qtd, 10) || 1)), 0);
  $('itensCounter').textContent = `${itens.length} ${itens.length === 1 ? 'item' : 'itens'} · ${volumes} ${volumes === 1 ? 'volume' : 'volumes'}`;
  $('itensBody').querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => abrirItem(+b.dataset.e)));
  $('itensBody').querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
    const origem = itens[+b.dataset.c];
    if (!origem) return;
    itens.splice(+b.dataset.c + 1, 0, { ...origem });
    renderItens();
    salvarRascunhoDebounced();
    toast('Item duplicado.');
  }));
  $('itensBody').querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => { if (await confirmarExclusaoItem()) { itens.splice(+b.dataset.d, 1); renderItens(); draftDirty = true; salvarRascunhoDebounced(); } }));
}
function abrirItem(i = -1) {
  editIdx = i; const it = itens[i] || { qtd: 1 };
  $('mItemTitle').textContent = i < 0 ? 'Adicionar Item' : 'Editar Item ' + (i + 1);
  $('iPessoa').value = it.pessoa || ''; $('iRef').value = it.ref || ''; $('iQtd').value = it.qtd || 1; $('iConteudo').value = ['Envelope', 'Pacote', 'Caixa', 'Outros'].includes(it.conteudo) ? it.conteudo : 'Envelope'; $('iObs').value = it.obs || '';
  atualizarAutocompletes();
  $('iSalvarMais').style.display = i < 0 ? '' : 'none';
  abrirModal($('mItem')); setTimeout(() => $('iPessoa').focus(), 50);
}
function salvarItem(mais) {
  const it = { pessoa: normalizarNomeCadastro($('iPessoa').value), ref: normalizarNomeCadastro($('iRef').value), qtd: Math.max(1, parseInt($('iQtd').value, 10) || 1), conteudo: $('iConteudo').value || 'Envelope', obs: $('iObs').value.trim() };
  if (!it.pessoa) return toast('Informe o remetente do item.', true);
  if (editIdx < 0) itens.push(it); else itens[editIdx] = it;
  aprenderPessoaDoItem(it.pessoa, 'rem');
  if (it.ref) aprenderPessoaDoItem(it.ref, 'dest');
  atualizarAutocompletes();
  renderItens(); draftDirty = true; salvarRascunhoDebounced();
  if (mais) abrirItem(-1); else fecharModal($('mItem'));
}
$('addItem').onclick = () => abrirItem(-1);
$('btnCadastroPessoas').onclick = abrirCadastroPessoas;
$('cadPessoaSalvar').onclick = salvarCadastroPessoa;
$('cadPessoaNovo').onclick = () => { limparEditorCadastro(); $('cadPessoaNome').focus(); };
$('cadPessoaBusca').oninput = renderCadastroPessoas;
$('cadPessoaOrdenacao').onchange = renderCadastroPessoas;
document.querySelectorAll('.cad-filter').forEach(b => b.onclick = () => { cadastroFiltro = b.dataset.cadFilter; document.querySelectorAll('.cad-filter').forEach(x => x.classList.toggle('active', x === b)); renderCadastroPessoas(); });
document.querySelectorAll('.cad-type').forEach(b => b.onclick = () => cadastroAplicarTipo(b.dataset.cadType));
$('cadPessoaRem').onchange = cadastroAtualizarTipoBotoes; $('cadPessoaDest').onchange = cadastroAtualizarTipoBotoes;
$('iSalvar').onclick = () => salvarItem(false);
$('iSalvarMais').onclick = () => salvarItem(true);
$('mItem').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.id !== 'iObs') salvarItem(editIdx < 0); });
$('mCadastroPessoas').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'cadPessoaNome') { e.preventDefault(); salvarCadastroPessoa(); } });

// ---------- Volumes / embalagens ----------
const normalizarTipo = (v) => String(v || '').trim();
function normalizarEmbalagens(m) {
  if (Array.isArray(m.embalagens) && m.embalagens.length) {
    return m.embalagens.map((x) => ({ quantidade: Math.max(1, parseInt(x.quantidade, 10) || 1), tipo: normalizarTipo(x.tipo) || 'Malote' }));
  }
  const qtd = String(m.volumes || '').match(/\d+/)?.[0];
  const tipo = normalizarTipo(m.embalagem) || String(m.volumes || '').replace(/^\d+\s*/i, '') || 'Malote';
  return [{ quantidade: Math.max(1, parseInt(qtd, 10) || 1), tipo }];
}
function pluralizarEmbalagem(tipo, quantidade) {
  if (quantidade === 1) return tipo;
  const t = tipo.toLowerCase();
  const mapa = { malote: 'malotes', caixa: 'caixas', envelope: 'envelopes', pacote: 'pacotes', outro: 'outros' };
  return mapa[t] || (t.endsWith('s') ? t : `${t}s`);
}
function formatarVolumes(list = embalagens) {
  return String(list.filter((x) => x.tipo).reduce((total, x) => total + (Math.max(1, parseInt(x.quantidade, 10) || 1)), 0));
}
function formatarTipos(list = embalagens) {
  return list.filter((x) => x.tipo).map((x) => `${x.quantidade} ${pluralizarEmbalagem(x.tipo, x.quantidade).toUpperCase()}`).join(' / ');
}
function renderEmbalagens() {
  const box = $('embalagensLista');
  box.innerHTML = embalagens.map((e, i) => `<div class="pack-item"><span><b>${esc(e.quantidade)}</b> ${esc(e.tipo)}</span><button type="button" class="del-pack" data-pack-del="${i}" title="Remover">×</button></div>`).join('');
  box.querySelectorAll('[data-pack-del]').forEach((b) => b.onclick = () => { embalagens.splice(+b.dataset.packDel, 1); renderEmbalagens(); });
}
$('addEmbalagem').onclick = () => {
  const quantidade = Math.max(1, parseInt($('qtdEmbalagem').value, 10) || 1);
  const tipo = normalizarTipo($('tipoEmbalagem').value) || 'Malote';
  const existente = embalagens.find((x) => x.tipo.toLowerCase() === tipo.toLowerCase());
  if (existente) existente.quantidade += quantidade;
  else embalagens.push({ quantidade, tipo });
  $('qtdEmbalagem').value = 1;
  renderEmbalagens();
};

// ---------- Editar remetente/destinatário ----------
document.querySelectorAll('[data-party-toggle]').forEach((b) => (b.onclick = () => {
  const target = $('box-' + b.dataset.partyToggle);
  const card = b.closest('.compact-party');
  const expanded = b.getAttribute('aria-expanded') === 'true';
  b.setAttribute('aria-expanded', String(!expanded));
  if (card) card.classList.toggle('is-expanded', !expanded);
  b.innerHTML = expanded ? ICO('chevron') + '<span>Detalhes</span>' : ICO('chevron','rot') + '<span>Ocultar</span>';
  if (target) target.hidden = expanded;
}));

document.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => {
  editParte = b.dataset.edit;
  $('mParteTitle').textContent = 'Editar ' + (editParte === 'remetente' ? 'Remetente' : 'Destinatário');
  $('mParteForm').innerHTML = partyForm('p', partes[editParte]);
  abrirModal($('mParte'));
}));
$('pSalvar').onclick = () => { partes[editParte] = readForm($('mParteForm'), 'p'); renderPartes(); fecharModal($('mParte')); toast('Alterado apenas nesta minuta.'); };
$('pSalvarFixo').onclick = async () => { partes[editParte] = readForm($('mParteForm'), 'p'); cfg[editParte] = { ...partes[editParte] }; await store.setConfig(cfg); renderPartes(); fecharModal($('mParte')); toast('Salvo como padrão.'); };

// ---------- Minuta ----------
function coletar() {
  const now = new Date();
  return {
    numero: $('numero').value.trim(), data: fmtData($('data').value), dataISO: $('data').value, veiculo: '', tipoEntrega: '',
    embalagens: embalagens.map((x) => ({ ...x })), volumes: formatarVolumes(), embalagem: formatarTipos(),
    obs: '', dataEntrega: fmtData($('dataEntrega').value), dataEntregaISO: $('dataEntrega').value, horaEntrega: $('horaEntrega').value, assinatura: $('assinatura').value.trim(),
    remetente: { ...partes.remetente }, destinatario: { ...partes.destinatario }, itens: itens.map((x) => ({ ...x })), revisao: modoRevisao,
    carimbo: now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '  -  ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}
async function validar(m) {
  if (!m.numero) return toast('Informe o nº da minuta.', true), false;
  if (!/^\d+$/.test(String(m.numero).trim())) return toast('O nº da minuta deve conter somente números.', true), false;
  if (!m.dataISO) return toast('Informe a data.', true), false;
  if (!m.remetente?.nome) return toast('Informe o remetente.', true), false;
  if (!m.destinatario?.nome) return toast('Informe o destinatário.', true), false;
  const qtdVolumes = (m.embalagens || []).reduce((n, x) => n + (Math.max(1, parseInt(x.quantidade, 10) || 0)), 0);
  if (!qtdVolumes) return toast('Adicione pelo menos um volume/embalagem.', true), false;
  if (!m.itens.length && !(await confirmarContinuarSemItens())) return false;
  for (const [i, it] of m.itens.entries()) {
    if (!it.pessoa) return toast(`Informe o Rem. / Setor do item ${i + 1}.`, true), false;
    if (!Number.isFinite(Number(it.qtd)) || Number(it.qtd) < 1) return toast(`Quantidade inválida no item ${i + 1}.`, true), false;
  }
  return true;
}
async function avancarNumero(m) {
  hist = await store.getHist();
}

async function atualizarNumeroAntesDeSalvar() {
  if (!hasApi || modoRevisao) return true;
  const r = await api.proximoNumero(cfg.digitos || 6);
  if (!r?.ok || !r.numero) {
    toast(r?.error || 'Não foi possível consultar a próxima numeração na planilha compartilhada.', true);
    return false;
  }
  $('numero').value = r.numero;
  return true;
}
function preencher(m, revisao = false) {
  modoRevisao = !!revisao;
  $('numero').value = m.numero; $('data').value = m.dataISO || hoje();
  embalagens = normalizarEmbalagens(m); renderEmbalagens();
  $('dataEntrega').value = m.dataEntregaISO || m.dataISO || hoje(); $('horaEntrega').value = m.horaEntrega || ''; $('assinatura').value = m.assinatura || '';
  partes = { remetente: { ...m.remetente }, destinatario: { ...m.destinatario } }; itens = (m.itens || []).map((x) => ({ pessoa: x.pessoa || '', ref: x.ref || '', qtd: x.qtd || 1, conteudo: ['Envelope', 'Pacote', 'Caixa', 'Outros'].includes(x.conteudo) ? x.conteudo : 'Outros', obs: x.obs || '' }));
  renderPartes(); renderItens();
}
async function novaMinuta() {
  modoRevisao = false;

  // Primeiro monta a minuta com os padrões locais. Assim, uma falha de rede,
  // planilha ou IPC nunca deixa a tela vazia. Depois tentamos obter o número
  // oficial da planilha compartilhada.
  const historicoNumeros = (hist || [])
    .map((h) => parseInt(String(h?.numero ?? '').replace(/\D/g, ''), 10))
    .filter(Number.isFinite);
  let numero = numeroCacheado?.() || pad(Math.max(Number(cfg.proximo) || 1, historicoNumeros.length ? Math.max(...historicoNumeros) + 1 : 1));

  preencher({
    numero,
    dataISO: hoje(),
    embalagens: [{ quantidade: 1, tipo: 'Malote' }],
    remetente: cfg.remetente || DEFAULT_CFG.remetente,
    destinatario: cfg.destinatario || DEFAULT_CFG.destinatario,
    itens: []
  });

  if (hasApi) {
    try {
      const r = await api.proximoNumero(cfg.digitos || 6);
      if (r?.ok && r.numero) {
        numero = r.numero;
        $('numero').value = numero;
        try { localStorage.setItem('minuta_next_number_cache', JSON.stringify({ numero, at: Date.now() })); } catch {}
      } else {
        toast(r?.error || 'Não foi possível consultar a planilha. A minuta foi carregada com os dados padrão.', true);
      }
    } catch (e) {
      console.error('Falha ao consultar próximo número:', e);
      toast('A planilha compartilhada não pôde ser consultada. Verifique o caminho em Configurações.', true);
    }
  }
}

$('btnNova').onclick = async () => { if (!itens.length || await confirmarNovaMinuta()) await novaMinuta(); };
$('btnVer').onclick = () => { $('prevFrame').srcdoc = buildPrintHTML(coletar()); abrirModal($('mPrev')); };
$('btnImprimir').onclick = async () => {
  const m = coletar(); if (!(await validar(m))) return;
  try {
    const html = buildPrintHTML(m);
    if (hasApi) {
      const r = await api.imprimir(html);
      if (!r.ok) return toast(r.error || 'Não foi possível abrir a impressão.', true);
    } else {
      const w = window.open('', '_blank');
      if (!w) return toast('O navegador bloqueou a janela de impressão.', true);
      w.document.open(); w.document.write(html); w.document.close();
      w.focus(); w.print();
    }
  } catch (err) { toast(String(err), true); }
};
$('btnCSV').onclick = async () => {
  if (!hasApi) return toast('Disponível no programa instalado.', true);
  if (!(await atualizarNumeroAntesDeSalvar())) return;
  let m = coletar(); if (!(await validar(m))) return;
  const r = await api.gerarCSV(m);
  if (!r.ok) {
    if (!modoRevisao && ((r.error || '').includes('já existe na planilha') || (r.error || '').includes('Próximo número disponível'))) {
      if (!(await atualizarNumeroAntesDeSalvar())) return;
      m = coletar();
      const retry = await api.gerarCSV(m);
      if (!retry.ok) return toast(retry.error, true);
      modoRevisao = true; await avancarNumero(m); toast('Itens registrados na planilha: ' + retry.path); return;
    }
    return toast(r.error, true);
  }
  modoRevisao = true; await avancarNumero(m); toast('Itens registrados na planilha: ' + r.path);
};
$('btnPDF').onclick = async () => {
  if (!hasApi) return toast('Disponível no programa instalado.', true);
  if (!(await atualizarNumeroAntesDeSalvar())) return;
  let m = coletar(); if (!(await validar(m))) return;
  $('btnPDF').disabled = true;
  try {
    let r = await api.gerarPDF(m, buildPrintHTML(m));
    if (!r.ok && !modoRevisao && ((r.error || '').includes('já existe na planilha') || (r.error || '').includes('Próximo número disponível'))) {
      if (!(await atualizarNumeroAntesDeSalvar())) return;
      m = coletar();
      r = await api.gerarPDF(m, buildPrintHTML(m));
    }
    if (!r.ok) return toast((r.error || '').includes('EBUSY') ? 'Feche a planilha no Excel e tente novamente.' : (r.error || 'Não foi possível gerar o PDF.'), true);
    modoRevisao = true;
    await avancarNumero(m);
    toast('Minuta gerada e itens registrados na planilha.');
    if (await confirmarNovaAposSalvar()) novaMinuta();
  } catch (err) {
    toast(String(err), true);
  } finally {
    $('btnPDF').disabled = false;
  }
};

async function confirmarDuplicacaoMinuta(minuta) {
  return confirmarAcaoCorporativa({
    titulo: 'Duplicar minuta',
    mensagem: `Criar uma nova minuta com base na nº ${esc(minuta.numero)}?`,
    detalhe: `Os dados de remetente, destinatário e itens serão copiados. Uma nova numeração será reservada e a nova minuta não será gravada até você gerar o PDF.`,
    confirmacao: 'Duplicar minuta',
    tipo: 'primary',
  });
}

// ---------- Histórico ----------
async function renderHist() {
  hist = await store.getHist();
  const q = $('busca').value.toLowerCase().trim();
  const periodo = $('histPeriodo')?.value || 'all';
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  if (periodo === '7') inicio.setDate(inicio.getDate() - 6);
  if (periodo === '30') inicio.setDate(inicio.getDate() - 29);

  const list = hist.filter((h) => {
    if (q && !JSON.stringify(h).toLowerCase().includes(q)) return false;
    if (periodo === 'all') return true;
    const iso = h.dataISO || dataISOHistoricoUI(h.data);
    if (!iso) return false;
    const d = new Date(iso + 'T00:00:00');
    return d >= inicio && d <= agora;
  });

  const totalVolumes = list.reduce((n, h) => n + (parseInt(h.volumes, 10) || 0), 0);
  const totalItens = list.reduce((n, h) => n + ((h.itens || []).length), 0);
  $('histSummary').innerHTML = `<span class="summary-chip">${list.length} minuta(s)</span><span class="summary-chip">${totalVolumes} volume(s)</span><span class="summary-chip">${totalItens} item(ns)</span>`;

  $('histBody').innerHTML = list.map((h) => `<tr><td><span class="history-number">${esc(h.numero)}</span></td><td>${esc(h.data)}</td><td>${esc(h.volumes)}</td><td><span class="history-count">${(h.itens || []).length}</span></td><td>${esc([...new Set((h.itens || []).map((i) => i.pessoa).filter(Boolean))].join(', '))}</td>
    <td class="act history-actions"><button title="Abrir / reeditar" data-o="${esc(h.numero)}">${ICO('edit')}<span>Abrir</span></button><button title="Duplicar minuta" data-dup="${esc(h.numero)}">${ICO('copy')}<span>Duplicar</span></button>${h.pdf ? `<button title="Abrir PDF" data-p="${esc(h.numero)}">${ICO('file')}<span>PDF</span></button>` : ''}<button class="del-history" title="Excluir minuta da planilha" data-x="${esc(h.numero)}">${ICO('trash')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="hint">Nenhuma minuta encontrada com os filtros atuais.</td></tr>';

  $('histBody').querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => { preencher(hist.find((h) => h.numero === b.dataset.o), true); limparRascunho(); go('nova'); }));
  $('histBody').querySelectorAll('[data-dup]').forEach((b) => (b.onclick = async () => {
    const origem = hist.find((h) => h.numero === b.dataset.dup);
    if (!origem) return;
    if (!(await confirmarDuplicacaoMinuta(origem))) return;
    await novaMinuta();
    const novoNumero = $('numero').value;
    const copia = { ...origem, numero: novoNumero, dataISO: hoje(), data: fmtData(hoje()), revisao: false, __rascunho: true };
    preencher(copia, false);
    toast(`Rascunho da minuta ${origem.numero} criado como nº ${novoNumero}.`);
    go('nova');
    salvarRascunhoDebounced();
  }));
  $('histBody').querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => api.abrirPDF(hist.find((h) => h.numero === b.dataset.p).pdf)));
  $('histBody').querySelectorAll('[data-x]').forEach((b) => (b.onclick = async () => {
    const minuta = hist.find((h) => h.numero === b.dataset.x);
    if (!minuta) return;
    const confirmou = await confirmarExclusaoMinuta(minuta);
    if (!confirmou) return;
    b.disabled = true;
    const original = b.innerHTML;
    b.innerHTML = '<span>Excluindo…</span>';
    const r = hasApi ? await api.excluirMinuta(minuta.numero) : { ok: false, error: 'A exclusão pelo banco compartilhado está disponível na versão desktop.' };
    b.disabled = false;
    b.innerHTML = original;
    if (!r?.ok) return toast(r?.error || 'Não foi possível excluir a minuta.', true);
    toast(`Minuta nº ${minuta.numero} excluída com sucesso. ${r.removidas || 0} registro(s) removido(s) da planilha.`);
    await renderHist();
  }));
}
function dataISOHistoricoUI(v) {
  const s = String(v || '').trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [d,m,a]=s.split('/'); return `${a}-${m}-${d}`; }
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
$('busca').oninput = renderHist;
$('histPeriodo')?.addEventListener('change', renderHist);
$('btnPlanilha').onclick = () => hasApi && api.abrirCSV();
$('btnPasta').onclick = $('btnPasta2').onclick = () => hasApi && api.abrirDados();


function lerConfiguracaoImpressao() {
  const s = {...(DEFAULT_CFG.impressao || {}), ...(cfg.impressao || {})};
  s.modelo = $('printModelo').value;
  s.fonte = $('printFonte').value;
  s.tamanho = Number($('printTamanho').value) || 12;
  s.titulo = Number($('printTitulo').value) || 14;
  s.alinhamento = $('printAlinhamento').value;
  s.margem = Number($('printMargem').value) || 16;
  s.espaco = Number($('printEspaco').value) || 8;
  s.textoTitulo = $('printTextoTitulo').value;
  s.textoSubtitulo = $('printTextoSubtitulo').value;
  s.peso = $('printPeso').value;
  s.mostrarData = $('printMostrarData').checked;
  s.mostrarCnpj = $('printMostrarCnpj').checked;
  s.mostrarIE = $('printMostrarIE').checked;
  s.mostrarContato = $('printMostrarContato').checked;
  s.mostrarTelefone = $('printMostrarTelefone').checked;
  s.mostrarCep = $('printMostrarCep').checked;
  s.mostrarNumero = $('printMostrarNumero').checked;
  s.mostrarDeclaracao = $('printMostrarDeclaracao').checked;
  s.mostrarEmbalagem = $('printMostrarEmbalagem').checked;
  s.mostrarVolumes = $('printMostrarVolumes').checked;
  cfg.impressao = s;
  return s;
}
function preencherConfiguracaoImpressao() {
  const s = {...(DEFAULT_CFG.impressao || {}), ...(cfg.impressao || {})};
  $('printModelo').value = s.modelo;
  $('printFonte').value = s.fonte;
  $('printTamanho').value = s.tamanho;
  $('printTitulo').value = s.titulo;
  $('printAlinhamento').value = s.alinhamento;
  $('printMargem').value = s.margem;
  $('printEspaco').value = s.espaco;
  $('printTextoTitulo').value = s.textoTitulo;
  $('printTextoSubtitulo').value = s.textoSubtitulo;
  $('printPeso').value = s.peso;
  $('printMostrarData').checked = s.mostrarData;
  $('printMostrarCnpj').checked = s.mostrarCnpj;
  $('printMostrarIE').checked = s.mostrarIE;
  $('printMostrarContato').checked = s.mostrarContato;
  $('printMostrarTelefone').checked = s.mostrarTelefone;
  $('printMostrarCep').checked = s.mostrarCep;
  $('printMostrarNumero').checked = s.mostrarNumero;
  $('printMostrarDeclaracao').checked = s.mostrarDeclaracao;
  $('printMostrarEmbalagem').checked = s.mostrarEmbalagem;
  $('printMostrarVolumes').checked = s.mostrarVolumes;
}

async function renderCfg() {
  $('cfgProx').value = cfg.proximo;
  $('cfgProx').readOnly = true;
  if (hasApi) {
    try {
      const r = await api.proximoNumero(cfg.digitos || 6);
      if (r?.ok) $('cfgProx').value = r.numero;
    } catch {}
  }
  $('cfgDig').value = cfg.digitos;
  preencherConfiguracaoImpressao();
  preencherSheetsUI();
  $('cfgPath').textContent = hasApi ? await api.dataPath() : '(navegador)';
  $('cfgPlanilha').textContent = (cfg.planilhaDir || DEFAULT_CFG.planilhaDir) + '\\registro_itens.csv';
}
$('btnEscolherPlanilha').onclick = async () => {
  if (!hasApi) return toast('Disponível no programa instalado.', true);
  const r = await api.escolherPlanilha();
  if (r?.ok) { cfg.planilhaDir = r.dir; await store.setConfig(cfg); renderCfg(); toast('Local da planilha atualizado.'); }
};
$('btnRestaurarPlanilha').onclick = async () => {
  if (!hasApi) return toast('Disponível no programa instalado.', true);
  cfg.planilhaDir = DEFAULT_CFG.planilhaDir;
  await store.setConfig(cfg);
  renderCfg();
  toast('Caminho padrão restaurado: ' + cfg.planilhaDir);
};
$('btnVerificarDuplicatas').onclick = async () => {
  if (!hasApi) return toast('Disponível no programa instalado.', true);
  const r = await api.verificarDuplicatas();
  if (!r?.ok) return toast(r?.error || 'Não foi possível verificar a planilha.', true);
  if (!r.exists) return toast('A planilha ainda não existe no local configurado.');
  if (!r.duplicates.length) return toast('Verificação concluída: não foram encontradas duplicidades de geração.');
  toast(`Atenção: ${r.duplicates.length} número(s) apresentam possíveis duplicidades.`, true);
};
$('salvarCfg').onclick = async () => {
  cfg.digitos = +$('cfgDig').value || 6;
  lerConfiguracaoImpressao();
  const bancoAntes = cfg.sheets?.banco || 'csv';
  lerSheetsUI();
  if (cfg.sheets.banco === 'sheets' && !cfg.sheets.url) { $('cfgBancoCsv').checked = true; cfg.sheets.banco = 'csv'; toast('Para usar o Google Sheets como base, informe a URL do script primeiro.', true); }
  await store.setConfig(cfg);
  atualizarSheetsStatus();
  window.verificarPlanilhaUI?.();
  if (bancoAntes !== 'sheets' && cfg.sheets.banco === 'sheets') await migrarParaGoogle();
  toast('Configurações salvas. A formatação será aplicada nas próximas impressões.');
};
$('btnPreviewPrint').onclick = () => {
  lerConfiguracaoImpressao();
  $('prevFrame').srcdoc = buildPrintHTML(coletar());
  abrirModal($('mPrev'));
};

(async function init() {
  const splashStart = performance.now();
  const MIN_SPLASH_MS = 1400;
  const splash = $('splashScreen');
  const status = $('splashStatus');

  // A interface nunca deve depender da planilha para aparecer.
  // Carregamos os padrões imediatamente e fazemos as consultas compartilhadas
  // de forma tolerante a falhas.
  try {
    if (status) status.textContent = 'Carregando configurações';
    const salvo = await store.getConfig();
    cfg = mesclarConfig(DEFAULT_CFG, salvo);
  } catch (err) {
    console.warn('Configuração indisponível; usando padrões.', err);
    cfg = mesclarConfig(DEFAULT_CFG, null);
  }

  // Garante que a tela já tenha remetente/destinatário e um número local
  // enquanto o restante é sincronizado.
  try {
    if (status) status.textContent = 'Preparando nova minuta';
    await novaMinuta();
  } catch (err) {
    console.error('Falha ao montar nova minuta:', err);
    preencher({
      numero: pad(cfg.proximo || 1),
      dataISO: hoje(),
      embalagens: [{ quantidade: 1, tipo: 'Malote' }],
      remetente: cfg.remetente || DEFAULT_CFG.remetente,
      destinatario: cfg.destinatario || DEFAULT_CFG.destinatario,
      itens: []
    });
  }

  try {
    await store.setConfig(cfg);
  } catch (err) {
    console.warn('Configuração não pôde ser persistida.', err);
  }

  try {
    if (status) status.textContent = 'Preparando histórico';
    hist = await store.getHist();
  } catch (err) {
    hist = [];
  }

  if (hasApi) {
    try {
      if (status) status.textContent = 'Verificando dados compartilhados';
      const r = await api.verificarDuplicatas();
      if (r?.ok && r.duplicates?.length) toast(`Atenção: ${r.duplicates.length} número(s) apresentam possíveis duplicidades na planilha.`, true);
    } catch (err) {
      console.warn('Verificação da planilha indisponível no momento.', err);
    }
  }

  if (status) status.textContent = 'Sistema pronto';
  go('nova');
  const remaining = Math.max(0, MIN_SPLASH_MS - (performance.now() - splashStart));
  await new Promise((resolve) => setTimeout(resolve, remaining));
  if (splash) splash.classList.add('is-hidden');
})();

/* =========================================================
   CAMADA DE PRODUTIVIDADE
   - cache de numeração
   - autosave de rascunho
   - banco local IndexedDB (sem tabela de itens)
   - inclusão em lote
   - atalhos
   - diagnóstico
========================================================= */
const DB_NAME = 'GeradorMinutaDB';
const DB_VERSION = 1;
const DRAFT_KEY = 'gerador_minuta_draft_v2';
let draftTimer = null;
let restoringDraft = false;
let draftDirty = false;

function dataISOAtualCampo() { return $('data')?.value || hoje(); }

const localDB = {
  open() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('app_meta')) db.createObjectStore('app_meta', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('history_meta')) db.createObjectStore('history_meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  },
  async put(storeName, value) {
    const db = await this.open(); if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false);
    });
  },
  async get(storeName, key) {
    const db = await this.open(); if (!db) return null;
    return new Promise((resolve) => {
      const req = db.transaction(storeName).objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null);
    });
  },
  async del(storeName, key) {
    const db = await this.open(); if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite'); tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false);
    });
  }
};

function setDraftStatus(text, cls='') {
  const el = $('draftStatus'); if (!el) return;
  el.textContent = text; el.className = 'draft-status ' + cls;
}
function draftSnapshot() {
  return {
    savedAt: new Date().toISOString(),
    numero: $('numero')?.value || '',
    dataISO: $('data')?.value || '',
    embalagens: embalagens.map(x => ({...x})),
    remetente: {...partes.remetente},
    destinatario: {...partes.destinatario},
    itens: itens.map(x => ({...x})),
    assinatura: $('assinatura')?.value || '',
    dataEntregaISO: $('dataEntrega')?.value || '',
    horaEntrega: $('horaEntrega')?.value || ''
  };
}
async function salvarRascunho() {
  if (restoringDraft || modoRevisao || !draftDirty) return;
  const snap = draftSnapshot();
  if (!snap.numero && !snap.itens.length) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(snap));
    await localDB.put('drafts', { key: 'current', ...snap });
    setDraftStatus('● Rascunho salvo automaticamente', 'saved');
  } catch { setDraftStatus('● Rascunho local', ''); }
}
function salvarRascunhoDebounced() {
  setDraftStatus('● Salvando rascunho...', 'saving');
  clearTimeout(draftTimer); draftTimer = setTimeout(salvarRascunho, 500);
}
async function limparRascunho() {
  draftDirty = false;
  try { localStorage.removeItem(DRAFT_KEY); await localDB.del('drafts', 'current'); } catch {}
  setDraftStatus('● Rascunho salvo automaticamente', 'saved');
}
async function recuperarRascunho() {
  let snap = null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY); snap = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!snap) snap = await localDB.get('drafts', 'current');
  if (!snap || !snap.savedAt) return;
  const age = Date.now() - new Date(snap.savedAt).getTime();
  if (age > 1000 * 60 * 60 * 24 * 7) { await limparRascunho(); return; }
  const ok = await confirmarAcaoCorporativa({
    titulo: 'Rascunho encontrado',
    mensagem: 'Existe uma minuta que não foi concluída.',
    detalhe: `Salva em ${new Date(snap.savedAt).toLocaleString('pt-BR')}. Deseja recuperar os dados?`,
    confirmacao: 'Recuperar',
    tipo: 'primary'
  });
  if (!ok) { await limparRascunho(); return; }
  restoringDraft = true;
  preencher({
    numero: snap.numero || pad(1),
    dataISO: snap.dataISO || hoje(),
    embalagens: snap.embalagens,
    remetente: snap.remetente || cfg.remetente,
    destinatario: snap.destinatario || cfg.destinatario,
    itens: snap.itens || [],
    dataEntregaISO: snap.dataEntregaISO || snap.dataISO || hoje(),
    horaEntrega: snap.horaEntrega || '',
    assinatura: snap.assinatura || ''
  }, false);
  restoringDraft = false;
  draftDirty = true;
  setDraftStatus('● Rascunho recuperado', 'recovered');
  toast('Rascunho recuperado. A numeração será validada novamente ao salvar.');
}

function cacheNumero(numero) {
  try { localStorage.setItem('minuta_next_number_cache', JSON.stringify({ numero, at: Date.now() })); } catch {}
}
function numeroCacheado() {
  try {
    const x = JSON.parse(localStorage.getItem('minuta_next_number_cache') || 'null');
    return x?.numero || '';
  } catch { return ''; }
}

/* Atualiza o número somente em segundo plano e salva cache */
const atualizarNumeroOriginal = atualizarNumeroAntesDeSalvar;
atualizarNumeroAntesDeSalvar = async function() {
  if (!hasApi || modoRevisao) return true;
  const r = await api.proximoNumero(cfg.digitos || 6);
  if (!r?.ok || !r.numero) {
    toast(r?.error || 'Não foi possível consultar a próxima numeração na planilha compartilhada.', true);
    return false;
  }
  $('numero').value = r.numero;
  cacheNumero(r.numero);
  salvarRascunhoDebounced();
  return true;
};

/* inclusão em lote */
function abrirItensLote() {
  $('itensLoteTexto').value = '';
  abrirModal($('mItensLote'));
  setTimeout(() => $('itensLoteTexto').focus(), 50);
}
$('addManyItems').onclick = abrirItensLote;
$('btnProcessarLote').onclick = () => {
  const linhas = $('itensLoteTexto').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!linhas.length) return toast('Informe pelo menos uma linha.', true);
  const novos = [];
  for (let i=0;i<linhas.length;i++) {
    const p = linhas[i].split('|').map(x => x.trim());
    if (!p[0]) return toast(`Linha ${i+1}: informe o Rem. / Setor.`, true);
    novos.push({ pessoa:p[0], ref:p[1]||'', qtd:Math.max(1,parseInt(p[2],10)||1), conteudo:['Envelope','Pacote','Caixa','Outros'].includes(p[3]) ? p[3] : 'Outros', obs:p[4]||'' });
  }
  itens.push(...novos); renderItens(); fecharModal($('mItensLote')); salvarRascunhoDebounced();
  toast(`${novos.length} item(ns) adicionado(s).`);
};

/* Diagnóstico */
async function carregarDiagnostico() {
  const body = $('diagnosticoBody');
  if (!body) return;
  body.innerHTML = '<div class="hint">Consultando informações...</div>';
  let d = null;
  try { d = hasApi ? await api.diagnostico() : { ok:true, appVersion:'navegador', dbInfo:{type:'IndexedDB'} }; } catch(e) { d = {ok:false,error:String(e)}; }
  if (!d?.ok) { body.innerHTML = `<div class="diagnostic-item"><small>Erro</small><strong class="diagnostic-bad">${esc(d?.error || 'Falha')}</strong></div>`; return; }
  const entries = [
    ['Aplicativo', d.appVersion || '—', true],
    ['Electron', d.electronVersion || '—', true],
    ['Node', d.nodeVersion || '—', true],
    ['Pasta de dados', d.dataPath || '—', true],
    ['Planilha', d.planilhaPath || '—', !!d.planilha?.exists],
    ['Pasta da planilha', d.planilhaDir || '—', !!d.planilhaWritable],
    ['Banco local', `${d.dbInfo?.type || '—'} · sem tabela de itens`, true],
    ['Cache da numeração', numeroCacheado() || 'Ainda não criado', true],
    ['Histórico local', d.historicoPath || '—', true],
  ];
  body.innerHTML = entries.map(([l,v,ok]) => `<div class="diagnostic-item"><small>${esc(l)}</small><strong class="${ok?'diagnostic-ok':'diagnostic-bad'}">${esc(v)}</strong></div>`).join('');
}
$('btnDiagnostico').onclick = async () => { abrirModal($('mDiagnostico')); await carregarDiagnostico(); };
$('btnDiagnosticoAtualizar').onclick = carregarDiagnostico;
$('btnAtalhos').onclick = () => abrirModal($('mAtalhos'));

/* atalhos de teclado — fluxo completo */
function modalAberto(id) { return !!$(id)?.classList.contains('open'); }
function focoTextoAtivo() {
  const el = document.activeElement;
  return !!el && ['INPUT','TEXTAREA','SELECT'].includes(el.tagName) && !el.readOnly && !el.disabled;
}
function modalAtual() { return [...document.querySelectorAll('.modal.open')].pop(); }
function fecharUltimoModal() {
  const m = modalAtual();
  if (m) { fecharModal(m); return true; }
  return false;
}
function executarAcaoPrincipal() {
  const m = modalAtual();
  if (!m) return false;
  if (m.id === 'mItem') return $('iSalvar')?.click(), true;
  if (m.id === 'mItensLote') return $('btnProcessarLote')?.click(), true;
  if (m.id === 'mParte') return $('pSalvar')?.click(), true;
  if (m.id === 'mAcaoCorporativa') return $('btnConfirmarAcao')?.click(), true;
  if (m.id === 'mExcluirMinuta') return $('btnConfirmarExclusao')?.click(), true;
  return false;
}
function navegarComAlt(n) {
  const mapa = { '1':'nova', '2':'historico', '3':'config' };
  if (mapa[n]) { go(mapa[n]); return true; }
  return false;
}
function atalhoExecutar(id) { const el = $(id); if (el && !el.disabled && getComputedStyle(el).display !== 'none') { el.click(); return true; } return false; }

document.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  const key = String(e.key || '').toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  const modal = modalAtual();

  // Escape sempre fecha a janela/modal mais acima.
  if (e.key === 'Escape') {
    if (fecharUltimoModal()) e.preventDefault();
    return;
  }

  // Atalhos de confirmação/ação dentro de modais.
  if (mod && e.key === 'Enter') {
    if (executarAcaoPrincipal()) e.preventDefault();
    return;
  }

  // F1 abre a central de atalhos.
  if (e.key === 'F1') {
    e.preventDefault();
    if (modal) fecharUltimoModal();
    else abrirModal($('mAtalhos'));
    return;
  }

  // F2/F3/F4/F5/F6/F7/F8 são atalhos operacionais rápidos.
  if (!mod && !e.altKey && e.key === 'F2') {
    e.preventDefault();
    if (!modal) atalhoExecutar('addItem');
    return;
  }
  if (!mod && !e.altKey && e.key === 'F3') {
    e.preventDefault();
    if (!modal) { $('qtdEmbalagem')?.focus(); $('qtdEmbalagem')?.select(); }
    return;
  }
  if (!mod && !e.altKey && e.key === 'F4') {
    e.preventDefault();
    if (!modal && document.querySelector('#v-nova.active')) atalhoExecutar('btnEditRemetente');
    return;
  }
  if (!mod && !e.altKey && e.key === 'F5') {
    e.preventDefault();
    if (!modal && document.querySelector('#v-nova.active')) atalhoExecutar('btnEditDestinatario');
    return;
  }
  if (!mod && !e.altKey && e.key === 'F6') {
    e.preventDefault();
    if (!modal && document.querySelector('#v-nova.active')) atalhoExecutar('btnVer');
    return;
  }
  if (!mod && !e.altKey && e.key === 'F7') {
    e.preventDefault();
    if (!modal && document.querySelector('#v-nova.active')) atalhoExecutar('btnPDF');
    return;
  }
  if (!mod && !e.altKey && e.key === 'F8') {
    e.preventDefault();
    if (!modal) go('historico');
    return;
  }

  // Navegação entre módulos.
  if (e.altKey && !mod && navegarComAlt(key)) {
    e.preventDefault();
    return;
  }

  if (mod && key === 'n') {
    e.preventDefault();
    atalhoExecutar('btnNova');
    return;
  }
  if (mod && key === 'p') {
    e.preventDefault();
    if (!modal) atalhoExecutar('btnImprimir');
    return;
  }
  if (mod && e.shiftKey && key === 's') {
    e.preventDefault();
    if (!modal) atalhoExecutar('btnCSV');
    return;
  }
  if (mod && key === 's') {
    e.preventDefault();
    if (modal) {
      if (!executarAcaoPrincipal()) toast('Feche a janela atual ou use Ctrl+Enter para confirmar.', true);
    } else {
      atalhoExecutar('btnPDF');
    }
    return;
  }
  if (mod && key === 'f') {
    e.preventDefault();
    if (document.querySelector('#v-historico.active')) $('busca')?.focus();
    else { go('historico'); setTimeout(() => $('busca')?.focus(), 30); }
    return;
  }
  if (mod && key === 'l') {
    e.preventDefault();
    if (document.querySelector('#v-historico.active')) $('busca')?.focus();
    else if (document.querySelector('#v-nova.active')) $('numero')?.focus();
    return;
  }
  if (mod && key === 'd') {
    // Na Nova Minuta, Ctrl+D leva ao campo de destinatário; não duplica algo por engano.
    e.preventDefault();
    if (!modal && document.querySelector('#v-nova.active')) atalhoExecutar('btnEditDestinatario');
    return;
  }
});

// Clique/teclado: IDs auxiliares para os botões que já existem visualmente.
const btnRem = document.querySelector('[data-edit="remetente"]');
const btnDest = document.querySelector('[data-edit="destinatario"]');
if (btnRem && !btnRem.id) btnRem.id = 'btnEditRemetente';
if (btnDest && !btnDest.id) btnDest.id = 'btnEditDestinatario';

// Enter no campo de quantidade de embalagem adiciona o volume sem precisar do mouse.
$('qtdEmbalagem')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('tipoEmbalagem')?.focus(); }
});
$('tipoEmbalagem')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); atalhoExecutar('addEmbalagem'); $('qtdEmbalagem')?.focus(); $('qtdEmbalagem')?.select(); }
});

/* autosave em alterações */
['numero','data','dataEntrega','horaEntrega','assinatura','qtdEmbalagem','tipoEmbalagem'].forEach(id => {
  $(id)?.addEventListener('input', () => { draftDirty = true; salvarRascunhoDebounced(); });
  $(id)?.addEventListener('change', () => { draftDirty = true; salvarRascunhoDebounced(); });
});
document.addEventListener('input', (e) => {
  if (e.target.matches('[data-f^="p."]')) { draftDirty = true; salvarRascunhoDebounced(); }
});
const _renderPartes = renderPartes;
renderPartes = function() { _renderPartes(); if (!restoringDraft) { draftDirty = true; salvarRascunhoDebounced(); } };
const _renderEmbalagens = renderEmbalagens;
renderEmbalagens = function() { _renderEmbalagens(); if (!restoringDraft) { draftDirty = true; salvarRascunhoDebounced(); } };
const _salvarItem = salvarItem;
salvarItem = function(mais) { _salvarItem(mais); draftDirty = true; salvarRascunhoDebounced(); };
const _preencher = preencher;
preencher = function(m, revisao=false) { _preencher(m,revisao); if (!revisao && (m?.itens?.length || m?.numero && m?.__rascunho)) { draftDirty = true; salvarRascunhoDebounced(); } };

/* limpar rascunho após sucesso */
const _btnPDFClickOriginal = $('btnPDF').onclick;
$('btnPDF').onclick = async function(e) {
  const before = $('numero').value;
  await _btnPDFClickOriginal.call(this,e);
  if (modoRevisao && $('numero').value === before) await limparRascunho();
};
const _btnCSVClickOriginal = $('btnCSV').onclick;
$('btnCSV').onclick = async function(e) {
  await _btnCSVClickOriginal.call(this,e);
  if (modoRevisao) await limparRascunho();
};

/* Reforça cache do número após sincronização */
const _novaMinutaOriginal = novaMinuta;
novaMinuta = async function() {
  await _novaMinutaOriginal();
  cacheNumero($('numero').value);
  draftDirty = false;
};

/* recuperação após inicialização */
setTimeout(async () => {
  try {
    await new Promise(r => setTimeout(r, 350));
    if (!modoRevisao) await recuperarRascunho();
  } catch(e) { console.warn('Falha ao recuperar rascunho', e); }
}, 1200);

setTimeout(() => {
  const el = $('draftStatus');
  if (el) el.title = 'F1 atalhos · Ctrl+S PDF · Ctrl+Shift+S planilha · Ctrl+N nova · Ctrl+P imprimir · F2 item · F3 volume · F4 remetente · F5 destinatário · F6 visualizar · F7 PDF · F8 histórico · Esc fechar';
}, 1500);

// O app.js agora é carregado depois do login, quando a página já está pronta.
if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", () => atualizarAutocompletes()); else atualizarAutocompletes();


/* =========================================================
   GOOGLE SHEETS · configuração e status
========================================================= */
function preencherSheetsUI() {
  const g = cfg.sheets || {};
  $('cfgSheetsUrl').value = g.url || '';
  $('cfgSheetsToken').value = g.token || '';
  $('cfgSheetsAtivo').checked = g.ativo !== false;
  $('cfgSheetsPdf').checked = g.enviarPdf !== false;
  (g.banco === 'sheets' ? $('cfgBancoSheets') : $('cfgBancoCsv')).checked = true;
  $('cfgCopiaCsv').checked = g.copiaCsv !== false;
  atualizarSheetsStatus();
}
function lerSheetsUI() {
  cfg.sheets = {
    url: $('cfgSheetsUrl').value.trim(),
    token: $('cfgSheetsToken').value.trim(),
    ativo: $('cfgSheetsAtivo').checked,
    enviarPdf: $('cfgSheetsPdf').checked,
    banco: $('cfgBancoSheets').checked ? 'sheets' : 'csv',
    copiaCsv: $('cfgCopiaCsv').checked,
  };
  return cfg.sheets;
}
function fmtHora(iso) { try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
let ultimoErroSheetsAvisado = '';
function desenharSheetsStatus(st) {
  const box = $('sheetsStatus'), txt = $('sheetsStatusText');
  const sb = $('sbSheets'), sbTxt = $('sbSheetsText'), sbSub = $('sbSheetsSub');
  let estado = 'off', texto = 'Não configurado', curto = 'Google Sheets', sub = '';
  if (st?.configurado && !st.ativo) { estado = 'off'; texto = 'Configurado, mas o envio automático está desativado.'; curto = 'Sheets desativado'; }
  else if (st?.configurado) {
    if (st.enviando) { estado = 'busy'; texto = 'Enviando para o Google Sheets…'; curto = 'Enviando ao Sheets…'; }
    else if (st.pendentes && st.ultimoErro) { estado = 'bad'; texto = `${st.pendentes} envio(s) pendente(s). Último erro: ${st.ultimoErro.mensagem}`; curto = `Sheets: ${st.pendentes} pendente(s)`; sub = st.ultimoErro.mensagem; }
    else if (st.pendentes) { estado = 'warn'; texto = `${st.pendentes} envio(s) aguardando.`; curto = `Sheets: ${st.pendentes} na fila`; }
    else if (st.banco) { estado = 'ok'; texto = 'Google Sheets é a base de dados' + (st.ultimoOk ? ` · última minuta gravada: ${st.ultimoOk.numero} às ${fmtHora(st.ultimoOk.em)}` : '.'); curto = 'Base: Google Sheets'; sub = st.ultimoOk ? `Última: nº ${st.ultimoOk.numero} · ${fmtHora(st.ultimoOk.em)}` : 'Conectado'; }
    else { estado = 'ok'; texto = st.ultimoOk ? `Sincronizado · minuta ${st.ultimoOk.numero} enviada às ${fmtHora(st.ultimoOk.em)}` : 'Conectado e sem pendências.'; curto = 'Google Sheets em dia'; sub = st.ultimoOk ? `Última: nº ${st.ultimoOk.numero} · ${fmtHora(st.ultimoOk.em)}` : ''; }
  }
  if (box) { box.dataset.state = estado; txt.textContent = texto; }
  if (sb) { sb.hidden = !st?.configurado || (st.banco && estado === 'ok'); sb.dataset.state = estado; sbTxt.textContent = curto; sbSub.textContent = sub; sb.title = texto; }
  // Avisa uma vez por erro novo, sem incomodar a cada tentativa.
  const chaveErro = st?.ultimoErro ? st.ultimoErro.numero + '|' + st.ultimoErro.mensagem : '';
  if (chaveErro && chaveErro !== ultimoErroSheetsAvisado && st.pendentes) {
    ultimoErroSheetsAvisado = chaveErro;
    toast(`Google Sheets: não foi possível enviar a minuta ${st.ultimoErro.numero}. Ela ficou na fila e será reenviada.`, true);
  }
  if (!chaveErro) ultimoErroSheetsAvisado = '';
}
async function atualizarSheetsStatus() {
  if (!hasApi || !api.sheetsStatus) return desenharSheetsStatus(null);
  try { desenharSheetsStatus(await api.sheetsStatus()); } catch {}
}
if (hasApi && api.onSheetsStatus) api.onSheetsStatus(desenharSheetsStatus);
setTimeout(atualizarSheetsStatus, 900);

$('btnSheetsTestar').onclick = async () => {
  if (!hasApi) return toast('Disponível no programa instalado.', true);
  const tmp = { url: $('cfgSheetsUrl').value.trim(), token: $('cfgSheetsToken').value.trim() };
  if (!tmp.url) return toast('Cole a URL do App da Web do Google primeiro.', true);
  const b = $('btnSheetsTestar'); b.disabled = true;
  try {
    const r = await api.sheetsTestar(tmp);
    if (r?.ok && !r.versao) toast('Conectou, mas o script do Google é da versão antiga. Publique uma "Nova versão" no Apps Script (veja o topo do GoogleSheets_Script.gs).', true);
    else if (r?.ok) toast(`Conexão OK com a planilha "${r.planilha || 'Google Sheets'}" (script v${r.versao}). Clique em Salvar para ativar.`);
    else toast('Falha na conexão: ' + (r?.error || 'sem detalhes'), true);
  } finally { b.disabled = false; }
};
$('btnSheetsReenviar').onclick = async () => {
  if (!hasApi) return toast('Disponível no programa instalado.', true);
  const st = await api.sheetsReenviar();
  desenharSheetsStatus(st);
  toast(st?.pendentes ? `${st.pendentes} envio(s) ainda pendente(s).` : 'Nenhuma pendência. Tudo enviado.', !!st?.pendentes);
};
$('btnSheetsTudo').onclick = async () => {
  if (!hasApi) return toast('Disponível no programa instalado.', true);
  const ok = await confirmarAcaoCorporativa({
    titulo: 'Enviar histórico completo',
    mensagem: 'Todas as minutas da planilha local serão enviadas ao Google Sheets.',
    detalhe: 'Minutas que já estão lá serão atualizadas (sem duplicar). Os PDFs existentes neste computador também serão enviados se a opção estiver marcada. Pode levar alguns minutos.',
    confirmacao: 'Enviar tudo', tipo: 'primary',
  });
  if (!ok) return;
  lerSheetsUI(); await store.setConfig(cfg);
  const r = await api.sheetsSincronizarTudo();
  if (!r?.ok) return toast(r?.error || 'Não foi possível iniciar o envio.', true);
  toast(`${r.enfileiradas} minuta(s) colocada(s) na fila de envio.`);
};


/* Troca da base para o Google Sheets: leva as minutas existentes junto */
async function migrarParaGoogle() {
  const ok = await confirmarAcaoCorporativa({
    titulo: 'Google Sheets agora é a base de dados',
    mensagem: 'Deseja enviar agora as minutas que já existem no registro_itens.csv para o Google?',
    detalhe: 'Recomendado: assim a numeração continua de onde parou. Minutas que já estão no Google são apenas atualizadas, sem duplicar. Pode levar alguns minutos.',
    confirmacao: 'Enviar minutas existentes', tipo: 'primary',
  });
  if (ok) {
    toast('Enviando as minutas existentes para o Google Sheets… aguarde.');
    const r = await api.sheetsSincronizarTudo();
    if (!r?.ok) toast(r?.error || 'Não foi possível enviar as minutas existentes.', true);
    else if (r.pendentes) toast(`${r.enfileiradas - r.pendentes} de ${r.enfileiradas} minuta(s) enviada(s). As demais ficaram na fila e serão reenviadas.`, true);
    else toast(`${r.enfileiradas} minuta(s) enviada(s). O Google Sheets já é a base de dados.`);
  }
  // Atualiza a numeração da minuta em edição com a sequência do Google.
  if (!modoRevisao) { try { const r = await api.proximoNumero(cfg.digitos || 6); if (r?.ok) { $('numero').value = r.numero; cacheNumero(r.numero); } } catch {} }
  hist = await store.getHist();
  renderCfg();
}
