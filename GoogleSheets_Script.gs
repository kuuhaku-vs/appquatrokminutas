/**
 * ============================================================
 *  GERADOR DE MINUTAS · QUATRO K  →  GOOGLE SHEETS
 * ============================================================
 *  Este script recebe as minutas enviadas pelo Gerador de Minutas
 *  e grava nesta planilha:
 *    • aba "Minutas" → uma linha por minuta (com link do PDF)
 *    • aba "Itens"   → uma linha por item de cada minuta
 *  Os PDFs ficam numa pasta do Drive ao lado desta planilha.
 *
 *  COMO INSTALAR (uma vez só):
 *   1. Crie uma planilha no Google Sheets (ex.: "Minutas Quatro K").
 *   2. Menu Extensões › Apps Script. Apague o que estiver lá e cole
 *      todo este arquivo.
 *   3. Troque o CODIGO_ACESSO abaixo por um código só seu.
 *   4. Clique em Salvar (ícone de disquete).
 *   5. Clique em Implantar › Nova implantação › engrenagem › "App da Web".
 *        - Executar como: Eu
 *        - Quem pode acessar: Qualquer pessoa
 *      Clique em Implantar e autorize o acesso com a sua conta Google.
 *   6. Copie a "URL do app da Web" (termina em /exec).
 *   7. No Gerador: Configurações › Google Sheets › cole a URL e o mesmo
 *      código de acesso › Testar conexão › Salvar.
 *
 *  ATUALIZANDO (já tinha a versão anterior instalada):
 *   1. Extensões › Apps Script › apague tudo e cole este arquivo.
 *   2. Mantenha o MESMO CODIGO_ACESSO que você já usava. Salve.
 *   3. Implantar › Gerenciar implantações › lápis (editar) ›
 *      Versão: "Nova versão" › Implantar. A URL continua a mesma.
 *
 *  A partir da versão 2.3 esta planilha também pode ser a BASE DE DADOS
 *  do Gerador (numeração, histórico e exclusões), no lugar do
 *  registro_itens.csv. Ative em Configurações › Google Sheets.
 *
 *  USUÁRIOS E LOGIN (versão 2.4):
 *   • Aba "Usuarios": uma linha por usuário, com perfil e permissões.
 *     A senha fica protegida (hash com sal); ninguém consegue lê-la.
 *   • PRIMEIRO ACESSO: depois de publicar esta versão, abra o Gerador.
 *     A tela de login pede o CODIGO_ACESSO abaixo e cria o administrador.
 *     Por isso o código precisa ser só seu (não deixe "TROQUE-ESTE-CODIGO").
 *   • Depois disso todo mundo entra com usuário e senha. O administrador
 *     cria os demais em Usuários, dentro do Gerador, e marca o que cada
 *     um pode acessar e alterar. Quem valida as permissões é este script.
 *   • CADASTRO PELA TELA DE LOGIN: a pessoa preenche nome, usuário e senha
 *     e já entra com o perfil CONSULTA (só vê o histórico). Só o
 *     administrador muda o perfil dela, em Usuários. Para desligar o
 *     cadastro, mude PERMITIR_CADASTRO para false.
 *   • Só o perfil Administrador gerencia usuários.
 *
 *  PEDIDOS DE ENVIO (versão 2.6):
 *   • Aba "Pedidos": quem tem "Pedir envios" (o perfil Consulta tem) lança
 *     um pedido dizendo de quem para quem vai o envio.
 *   • Quem cria minutas é avisado no Gerador e inclui o pedido no malote.
 *     Ao gerar o PDF ou registrar a minuta, o pedido fica INCLUÍDO com o
 *     número dela. Excluir a minuta devolve o pedido para AGUARDANDO.
 *   • Enquanto nenhum usuário existir, tudo funciona como antes
 *     (só com o código de acesso).
 *   • ESQUECI A SENHA DO ADMINISTRADOR: apague as linhas da aba
 *     "Usuarios" (deixe a linha 1) e refaça o primeiro acesso.
 *   • Não edite à mão as colunas "Senha (protegida)" e "Sessão".
 * ============================================================
 */

const CODIGO_ACESSO = 'TROQUE-ESTE-CODIGO';      // o mesmo código informado no Gerador
const NOME_PASTA_PDF = 'Minutas Quatro K - PDFs'; // criada ao lado desta planilha
const ABA_MINUTAS = 'Minutas';
const ABA_ITENS = 'Itens';
const ABA_USUARIOS = 'Usuarios';
const ABA_PEDIDOS = 'Pedidos';
const VERSAO_SCRIPT = '2.6';
const CAB_MINUTAS = ['Minuta', 'Data', 'Volumes', 'Embalagem', 'Remetente', 'Destinatário', 'Qtd. itens', 'Pessoas', 'PDF', 'Atualizado em', 'Origem', 'Dados', 'Usuário'];
const CAB_PEDIDOS = ['ID', 'Criado em', 'Usuário', 'Nome', 'De', 'Para', 'Qtd.', 'Conteúdo', 'Obs.', 'Situação', 'Minuta', 'Atendido por', 'Atendido em', 'Motivo'];
const MAX_PEDIDOS_ABERTOS = 30; // pedidos aguardando por pessoa
const CAB_USUARIOS = ['Usuário', 'Nome', 'Perfil', 'Permissões', 'Ativo', 'Senha (protegida)', 'Sessão', 'Criado em', 'Último acesso'];

// O que cada usuário pode acessar e alterar. O perfil "admin" tem tudo.
const PERMISSOES = ['minutas.criar', 'minutas.editar', 'minutas.excluir', 'historico.ver', 'pedidos.criar', 'frete.usar', 'cadastros.editar', 'config.acessar', 'usuarios.gerenciar'];
const PERFIS = {
  admin: PERMISSOES,
  operador: ['minutas.criar', 'minutas.editar', 'historico.ver', 'frete.usar', 'cadastros.editar'],
  consulta: ['historico.ver', 'pedidos.criar'],
  personalizado: null
};
const SESSAO_HORAS = 12;          // sessão normal
const SESSAO_DIAS_LEMBRAR = 30;   // com "Manter conectado"
const SENHA_MINIMO = 6;
const SENHA_ITERACOES = 1000;     // PBKDF2-HMAC-SHA256 (o Apps Script é lento; não aumente demais)
const PERMITIR_CADASTRO = true;   // true: a tela de login deixa a pessoa criar o próprio usuário (sempre como Consulta)
const MAX_CADASTROS_HORA = 20;    // limite de cadastros pela tela de login por hora
const MAX_TENTATIVAS = 5;         // depois disso o login espera 5 minutos
const CAB_ITENS = ['Minuta', 'Data', 'Item', 'Rem. / Setor', 'Dest. / Setor', 'Qtd.', 'Conteúdo', 'Obs.'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const abaU = obterAba(ss, ABA_USUARIOS, CAB_USUARIOS);
    const usuarios = lerUsuarios(abaU);

    // Ações de login (não exigem sessão).
    if (req.acao === 'auth.estado') return resposta({ ok: true, temUsuarios: usuarios.length > 0, cadastro: PERMITIR_CADASTRO });
    if (req.acao === 'auth.cadastrar') return resposta(pedirCadastro(ss, abaU, usuarios, req));
    if (req.acao === 'auth.primeiro') return resposta(primeiroAcesso(ss, abaU, usuarios, req));
    if (req.acao === 'auth.login') return resposta(entrar(ss, abaU, usuarios, req));

    // Daqui para baixo: só com sessão válida (ou com o código, enquanto não houver usuários).
    const quem = autenticar(req, usuarios);
    if (req.acao === 'auth.eu') return resposta({ ok: true, usuario: publico(quem), sessao: renovarSessao(quem, req.sessao) });
    if (req.acao === 'auth.senha') return resposta(trocarSenha(abaU, quem, req));
    if (req.acao === 'pedidos.criar') { exigir(quem, 'pedidos.criar'); return resposta(criarPedido(ss, quem, req)); }
    if (req.acao === 'pedidos.listar') return resposta(listarPedidos(ss, quem));
    if (req.acao === 'pedidos.cancelar') return resposta(cancelarPedido(ss, quem, req));
    if (req.acao === 'usuarios.listar') { exigir(quem, 'usuarios.gerenciar'); return resposta({ ok: true, usuarios: usuarios.map(publico), permissoes: PERMISSOES, perfis: PERFIS }); }
    if (req.acao === 'usuarios.salvar') { exigir(quem, 'usuarios.gerenciar'); return resposta(salvarUsuario(ss, abaU, usuarios, quem, req)); }
    if (req.acao === 'usuarios.excluir') { exigir(quem, 'usuarios.gerenciar'); return resposta(excluirUsuario(abaU, usuarios, quem, req)); }

    const abaM = obterAba(ss, ABA_MINUTAS, CAB_MINUTAS);
    const abaI = obterAba(ss, ABA_ITENS, CAB_ITENS);

    if (req.acao === 'teste') return resposta({ ok: true, versao: VERSAO_SCRIPT, planilha: ss.getName(), url: ss.getUrl() });

    if (req.acao === 'proximo') {
      const max = maiorNumero(abaM);
      return resposta({ ok: true, versao: VERSAO_SCRIPT, max: max, numero: preencher(max + 1, req.digitos), url: ss.getUrl() });
    }

    if (req.acao === 'listar') {
      exigir(quem, 'historico.ver');
      return resposta({ ok: true, versao: VERSAO_SCRIPT, url: ss.getUrl(), minutas: listarMinutas(ss, abaM, abaI) });
    }

    const m = req.minuta || {};
    const num = normalizarNumero(m.numero);
    if (!num) return resposta({ ok: false, error: 'Número de minuta inválido.' });

    if (req.acao === 'excluir') {
      exigir(quem, 'minutas.excluir');
      const r = removerLinhas(abaM, num, true);
      removerLinhas(abaI, num, false);
      if (r.qtd) devolverPedidos(ss, num);
      return resposta({ ok: true, removidas: r.qtd });
    }

    if (req.acao === 'registrar') {
      // Quando esta planilha é a base de dados, valida a sequência dentro do
      // bloqueio, para dois computadores nunca gravarem o mesmo número.
      if (req.validarSequencia && !req.revisao) {
        const max = maiorNumero(abaM);
        const proximo = preencher(max + 1, req.digitos);
        if (existeNumero(abaM, num)) return resposta({ ok: false, codigo: 'existe', proximo: proximo, error: 'A minuta nº ' + m.numero + ' já existe na planilha. Próximo número disponível: ' + proximo + '.' });
        if (Number(num) !== max + 1) return resposta({ ok: false, codigo: 'sequencia', proximo: proximo, error: 'A numeração foi alterada na planilha. Próximo número disponível: ' + proximo + '.' });
      }
      // Gravar por cima de uma minuta que já existe é "alterar"; número novo é "criar".
      exigir(quem, existeNumero(abaM, num) ? 'minutas.editar' : 'minutas.criar');
      const anterior = removerLinhas(abaM, num, true);
      removerLinhas(abaI, num, false);

      let linkPdf = anterior.pdf || '';
      if (req.pdf && req.pdf.base64) linkPdf = salvarPdf(ss, req.pdf.nome || ('Minuta_' + m.numero + '.pdf'), req.pdf.base64);

      const itens = Array.isArray(m.itens) ? m.itens : [];
      const pessoas = Array.from(new Set(itens.map(function (i) { return i.pessoa; }).filter(String))).join(', ');
      const numeroTexto = String(m.numero);

      const linhaM = abaM.getLastRow() + 1;
      abaM.getRange(linhaM, 1, 1, CAB_MINUTAS.length).setValues([[
        numeroTexto, m.data || '', m.volumes || '', m.embalagem || '', m.remetente || '', m.destinatario || '',
        itens.length, pessoas, linkPdf, agoraTexto(ss), m.origem || '', m.dados ? JSON.stringify(m.dados) : '', quem.nome || quem.usuario || ''
      ]]);

      if (itens.length) {
        const linhaI = abaI.getLastRow() + 1;
        abaI.getRange(linhaI, 1, itens.length, CAB_ITENS.length).setValues(itens.map(function (it, i) {
          return [numeroTexto, m.data || '', i + 1, it.pessoa || '', it.ref || '', Number(it.qtd) || 1, it.conteudo || '', it.obs || ''];
        }));
      }
      ordenar(abaM, CAB_MINUTAS.length);
      ordenar(abaI, CAB_ITENS.length);
      const pedidos = marcarPedidosIncluidos(ss, itens, numeroTexto, quem);
      return resposta({ ok: true, pdf: linkPdf, url: ss.getUrl(), pedidosIncluidos: pedidos });
    }

    return resposta({ ok: false, error: 'Ação desconhecida: ' + req.acao });
  } catch (err) {
    return resposta({ ok: false, codigo: (err && err.codigo) || undefined, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return resposta({ ok: true, versao: VERSAO_SCRIPT, servico: 'Gerador de Minutas · Quatro K', planilha: SpreadsheetApp.getActiveSpreadsheet().getName() });
}

// ---------- Auxiliares ----------
function resposta(obj) {
  obj.versao = VERSAO_SCRIPT;
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normalizarNumero(v) {
  const s = String(v == null ? '' : v).replace(/\D/g, '');
  return s ? String(parseInt(s, 10)) : '';
}

function obterAba(ss, nome, cabecalho) {
  let aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho])
      .setFontWeight('bold').setBackground('#0f1a33').setFontColor('#ffffff');
    aba.setFrozenRows(1);
    const padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
    if (padrao && padrao.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(padrao);
  }
  // Planilhas criadas pela versão anterior ganham as colunas novas no cabeçalho.
  const atual = aba.getRange(1, 1, 1, cabecalho.length).getValues()[0];
  if (atual.join('|') !== cabecalho.join('|')) {
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho])
      .setFontWeight('bold').setBackground('#0f1a33').setFontColor('#ffffff');
  }
  // Número e data como texto: mantém zeros à esquerda (000123) e evita
  // conversão automática de datas.
  aba.getRange('A:B').setNumberFormat('@');
  return aba;
}

function removerLinhas(aba, num, guardarPdf) {
  const ultima = aba.getLastRow();
  const res = { qtd: 0, pdf: '' };
  if (ultima < 2) return res;
  const valores = aba.getRange(2, 1, ultima - 1, Math.max(9, aba.getLastColumn())).getValues();
  for (let i = valores.length - 1; i >= 0; i--) {
    if (normalizarNumero(valores[i][0]) === num) {
      if (guardarPdf && valores[i][8] && !res.pdf) res.pdf = valores[i][8];
      aba.deleteRow(i + 2);
      res.qtd++;
    }
  }
  return res;
}

function ordenar(aba, colunas) {
  const ultima = aba.getLastRow();
  if (ultima > 2) aba.getRange(2, 1, ultima - 1, colunas).sort([{ column: 1, ascending: false }]);
}

function obterPastaPdf(ss) {
  const arquivo = DriveApp.getFileById(ss.getId());
  const pais = arquivo.getParents();
  const base = pais.hasNext() ? pais.next() : DriveApp.getRootFolder();
  const existentes = base.getFoldersByName(NOME_PASTA_PDF);
  return existentes.hasNext() ? existentes.next() : base.createFolder(NOME_PASTA_PDF);
}

function salvarPdf(ss, nome, base64) {
  const pasta = obterPastaPdf(ss);
  const iguais = pasta.getFilesByName(nome);
  while (iguais.hasNext()) iguais.next().setTrashed(true);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', nome);
  return pasta.createFile(blob).getUrl();
}

function preencher(n, digitos) {
  const d = Math.max(1, Number(digitos) || 6);
  let s = String(n);
  while (s.length < d) s = '0' + s;
  return s;
}

function maiorNumero(aba) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return 0;
  let max = 0;
  aba.getRange(2, 1, ultima - 1, 1).getValues().forEach(function (r) {
    const n = Number(normalizarNumero(r[0]));
    if (n > max) max = n;
  });
  return max;
}

function existeNumero(aba, num) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return false;
  return aba.getRange(2, 1, ultima - 1, 1).getValues().some(function (r) { return normalizarNumero(r[0]) === num; });
}

function textoCelula(v, ss, formato) {
  if (v instanceof Date) return Utilities.formatDate(v, ss.getSpreadsheetTimeZone(), formato || 'dd/MM/yyyy');
  return v == null ? '' : String(v);
}

function agoraTexto(ss) {
  return Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}

function listarMinutas(ss, abaM, abaI) {
  const itensPorNumero = {};
  const ultI = abaI.getLastRow();
  if (ultI >= 2) {
    abaI.getRange(2, 1, ultI - 1, CAB_ITENS.length).getValues().forEach(function (r) {
      const num = normalizarNumero(r[0]);
      if (!num) return;
      (itensPorNumero[num] = itensPorNumero[num] || []).push({
        item: Number(r[2]) || 0, pessoa: textoCelula(r[3], ss), ref: textoCelula(r[4], ss),
        qtd: Number(r[5]) || 1, conteudo: textoCelula(r[6], ss), obs: textoCelula(r[7], ss)
      });
    });
  }
  const ultM = abaM.getLastRow();
  if (ultM < 2) return [];
  return abaM.getRange(2, 1, ultM - 1, CAB_MINUTAS.length).getValues().map(function (r) {
    const num = normalizarNumero(r[0]);
    if (!num) return null;
    let dados = null;
    try { dados = r[11] ? JSON.parse(r[11]) : null; } catch (e) { dados = null; }
    const itens = (itensPorNumero[num] || []).sort(function (a, b) { return a.item - b.item; })
      .map(function (i) { return { pessoa: i.pessoa, ref: i.ref, qtd: i.qtd, conteudo: i.conteudo, obs: i.obs }; });
    return {
      numero: textoCelula(r[0], ss), data: textoCelula(r[1], ss), volumes: textoCelula(r[2], ss), embalagem: textoCelula(r[3], ss),
      remetente: textoCelula(r[4], ss), destinatario: textoCelula(r[5], ss), pdf: textoCelula(r[8], ss),
      atualizadoEm: textoCelula(r[9], ss, 'dd/MM/yyyy HH:mm:ss'), origem: textoCelula(r[10], ss), dados: dados, itens: itens
    };
  }).filter(function (x) { return x; });
}

// ============================================================
//  USUÁRIOS, LOGIN E PERMISSÕES
// ============================================================
function erroAcesso(codigo, mensagem) { const e = new Error(mensagem); e.codigo = codigo; return e; }

function normalizarUsuario(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

function permissoesEfetivas(perfil, lista) {
  if (perfil === 'admin') return PERMISSOES.slice();
  const base = PERFIS[perfil] ? PERFIS[perfil] : (Array.isArray(lista) ? lista : String(lista || '').split(/[,;\s]+/));
  // Gerenciar usuários é só do perfil Administrador.
  const p = PERMISSOES.filter(function (x) { return base.indexOf(x) >= 0 && x !== 'usuarios.gerenciar'; });
  // Quem altera ou exclui precisa enxergar o histórico para achar a minuta.
  if ((p.indexOf('minutas.editar') >= 0 || p.indexOf('minutas.excluir') >= 0) && p.indexOf('historico.ver') < 0) p.push('historico.ver');
  return p;
}

function lerUsuarios(abaU) {
  const ultima = abaU.getLastRow();
  if (ultima < 2) return [];
  const ss = abaU.getParent();
  return abaU.getRange(2, 1, ultima - 1, CAB_USUARIOS.length).getValues().map(function (r, i) {
    const usuario = normalizarUsuario(r[0]);
    if (!usuario) return null;
    const perfil = PERFIS.hasOwnProperty(String(r[2])) ? String(r[2]) : 'personalizado';
    const situacao = String(r[4]).trim().toUpperCase();
    return {
      linha: i + 2, usuario: usuario, nome: String(r[1] || ''), perfil: perfil, permissoes: permissoesEfetivas(perfil, r[3]),
      ativo: situacao === 'SIM' || situacao === '', pendente: situacao === 'PENDENTE', hash: String(r[5] || ''), sv: Number(r[6]) || 1,
      criadoEm: textoCelula(r[7], ss, 'dd/MM/yyyy HH:mm:ss'), ultimoAcesso: textoCelula(r[8], ss, 'dd/MM/yyyy HH:mm:ss')
    };
  }).filter(function (x) { return x; });
}

function gravarUsuario(abaU, u) {
  const linha = u.linha || (abaU.getLastRow() + 1);
  abaU.getRange(linha, 1, 1, CAB_USUARIOS.length).setNumberFormat('@').setValues([[
    u.usuario, u.nome, u.perfil, u.perfil === 'personalizado' ? u.permissoes.join(', ') : '', u.pendente ? 'PENDENTE' : (u.ativo ? 'SIM' : 'NÃO'),
    u.hash, String(u.sv), u.criadoEm || '', u.ultimoAcesso || ''
  ]]);
  u.linha = linha;
  return u;
}

function publico(u) {
  return { usuario: u.usuario, nome: u.nome, perfil: u.perfil, permissoes: u.permissoes, ativo: u.ativo !== false, pendente: !!u.pendente, criadoEm: u.criadoEm || '', ultimoAcesso: u.ultimoAcesso || '', legado: !!u.legado };
}

function exigir(quem, permissao) {
  if (quem.permissoes.indexOf(permissao) < 0) throw erroAcesso('permissao', 'Seu usuário não tem permissão para isso (' + permissao + '). Fale com o administrador.');
}

function autenticar(req, usuarios) {
  // Sem nenhum usuário cadastrado: funciona como antes, só com o código de acesso.
  if (!usuarios.length) {
    if (CODIGO_ACESSO && req.token !== CODIGO_ACESSO) throw erroAcesso('codigo', 'Código de acesso inválido.');
    return { usuario: '', nome: '', perfil: 'admin', permissoes: PERMISSOES.slice(), ativo: true, legado: true };
  }
  const s = lerSessao(req.sessao);
  const u = s && usuarios.filter(function (x) { return x.usuario === s.u; })[0];
  if (!u || !u.ativo || u.sv !== s.sv) throw erroAcesso('login', 'Sessão encerrada. Entre de novo com seu usuário e senha.');
  return u;
}

// ---------- senha (PBKDF2-HMAC-SHA256) ----------
function derivarSenha(senha, sal, iteracoes) {
  const chave = Utilities.newBlob(String(senha)).getBytes();
  const bloco = Array.prototype.slice.call(Utilities.newBlob(String(sal)).getBytes()).concat([0, 0, 0, 1]);
  let u = Utilities.computeHmacSha256Signature(bloco, chave);
  const out = Array.prototype.slice.call(u);
  for (let i = 1; i < iteracoes; i++) {
    u = Utilities.computeHmacSha256Signature(u, chave);
    for (let j = 0; j < out.length; j++) out[j] ^= u[j];
  }
  return Utilities.base64Encode(out);
}
function protegerSenha(senha) {
  const sal = Utilities.getUuid().replace(/-/g, '');
  return 'pbkdf2$' + SENHA_ITERACOES + '$' + sal + '$' + derivarSenha(senha, sal, SENHA_ITERACOES);
}
function iguais(a, b) {
  a = String(a); b = String(b);
  let dif = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i % (b.length || 1));
  return dif === 0;
}
function conferirSenha(senha, guardado) {
  const p = String(guardado || '').split('$');
  if (p.length !== 4 || p[0] !== 'pbkdf2' || !senha) return false;
  const n = Number(p[1]);
  if (!(n >= 1 && n <= 100000)) return false;
  return iguais(derivarSenha(senha, p[2], n), p[3]);
}
function validarSenhaNova(senha) {
  senha = String(senha == null ? '' : senha);
  if (senha.length < SENHA_MINIMO) throw erroAcesso('senha', 'A senha precisa ter pelo menos ' + SENHA_MINIMO + ' caracteres.');
  if (senha.length > 100) throw erroAcesso('senha', 'A senha é longa demais.');
  return senha;
}

// ---------- sessão (texto assinado; nada fica guardado na planilha) ----------
function segredoSessao() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SEGREDO_SESSAO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SEGREDO_SESSAO', s); }
  return s;
}
function assinar(texto) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(texto, segredoSessao())); }
function criarSessao(u, lembrar) {
  const expira = Date.now() + (lembrar ? SESSAO_DIAS_LEMBRAR * 24 : SESSAO_HORAS) * 3600 * 1000;
  const corpo = Utilities.base64EncodeWebSafe(JSON.stringify({ u: u.usuario, sv: u.sv, exp: expira, l: lembrar ? 1 : 0 }), Utilities.Charset.UTF_8);
  return { token: corpo + '.' + assinar(corpo), expira: expira };
}
function lerSessao(token) {
  const partes = String(token || '').split('.');
  if (partes.length !== 2 || !partes[0] || !iguais(assinar(partes[0]), partes[1])) return null;
  try {
    const s = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString());
    return s && s.u && Number(s.exp) > Date.now() ? s : null;
  } catch (e) { return null; }
}
// "Manter conectado": quando passa da metade do prazo, devolve uma sessão nova.
function renovarSessao(u, token) {
  const s = u.legado ? null : lerSessao(token);
  if (!s || !s.l) return null;
  return (s.exp - Date.now()) < SESSAO_DIAS_LEMBRAR * 12 * 3600 * 1000 ? criarSessao(u, true) : null;
}

// ---------- tentativas de login ----------
function tentativas(chave) { return Number(CacheService.getScriptCache().get('falhas:' + chave)) || 0; }
function contarFalha(chave) { CacheService.getScriptCache().put('falhas:' + chave, String(tentativas(chave) + 1), 300); }
function limparFalhas(chave) { CacheService.getScriptCache().remove('falhas:' + chave); }
function exigirTentativa(chave) {
  if (tentativas(chave) >= MAX_TENTATIVAS) throw erroAcesso('bloqueado', 'Muitas tentativas seguidas. Aguarde 5 minutos e tente de novo.');
}

// ---------- ações ----------
function validarNomeUsuario(v) {
  const usuario = normalizarUsuario(v);
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(usuario)) throw erroAcesso('usuario', 'O usuário deve ter de 3 a 30 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.');
  return usuario;
}

function primeiroAcesso(ss, abaU, usuarios, req) {
  if (usuarios.length) throw erroAcesso('existe', 'O administrador já foi criado. Entre com usuário e senha.');
  if (!CODIGO_ACESSO || CODIGO_ACESSO === 'TROQUE-ESTE-CODIGO') throw erroAcesso('codigo', 'Antes de criar o administrador, troque o CODIGO_ACESSO no script do Google por um código só seu e publique uma nova versão.');
  exigirTentativa('primeiro');
  if (!iguais(String(req.codigo || ''), CODIGO_ACESSO)) { contarFalha('primeiro'); throw erroAcesso('codigo', 'Código de acesso inválido.'); }
  limparFalhas('primeiro');
  const agora = agoraTexto(ss);
  const u = gravarUsuario(abaU, {
    usuario: validarNomeUsuario(req.usuario), nome: String(req.nome || '').trim() || 'Administrador', perfil: 'admin', permissoes: PERMISSOES.slice(),
    ativo: true, hash: protegerSenha(validarSenhaNova(req.senha)), sv: 1, criadoEm: agora, ultimoAcesso: agora
  });
  return { ok: true, usuario: publico(u), sessao: criarSessao(u, !!req.lembrar) };
}

function entrar(ss, abaU, usuarios, req) {
  if (!usuarios.length) throw erroAcesso('primeiro', 'Nenhum usuário cadastrado ainda. Faça o primeiro acesso.');
  const nome = normalizarUsuario(req.usuario);
  const chave = nome.slice(0, 40);
  exigirTentativa(chave);
  const u = usuarios.filter(function (x) { return x.usuario === nome; })[0];
  if (!u || !conferirSenha(String(req.senha || ''), u.hash)) { contarFalha(chave); throw erroAcesso('credenciais', 'Usuário ou senha incorretos.'); }
  if (u.pendente) throw erroAcesso('pendente', 'Seu cadastro ainda aguarda a aprovação do administrador.');
  if (!u.ativo) throw erroAcesso('inativo', 'Este usuário está desativado. Fale com o administrador.');
  limparFalhas(chave);
  u.ultimoAcesso = agoraTexto(ss);
  abaU.getRange(u.linha, 9).setNumberFormat('@').setValue(u.ultimoAcesso);
  return { ok: true, usuario: publico(u), sessao: criarSessao(u, !!req.lembrar) };
}

// Cadastro feito pela própria pessoa na tela de login: entra sempre como CONSULTA.
// O que vier no pedido além de nome, usuário e senha é ignorado; só o administrador muda o perfil.
function pedirCadastro(ss, abaU, usuarios, req) {
  if (!usuarios.length) throw erroAcesso('primeiro', 'Nenhum usuário cadastrado ainda. Faça o primeiro acesso.');
  if (!PERMITIR_CADASTRO) throw erroAcesso('fechado', 'O cadastro pela tela de login está desligado. Peça um usuário ao administrador.');
  const cache = CacheService.getScriptCache();
  const feitos = Number(cache.get('cadastros')) || 0;
  if (feitos >= MAX_CADASTROS_HORA) throw erroAcesso('bloqueado', 'Muitos cadastros em pouco tempo. Tente de novo mais tarde ou fale com o administrador.');
  const nome = validarNomeUsuario(req.usuario);
  if (usuarios.some(function (x) { return x.usuario === nome; })) throw erroAcesso('existe', 'Já existe um usuário "' + nome + '". Escolha outro.');
  const senha = validarSenhaNova(req.senha);
  cache.put('cadastros', String(feitos + 1), 3600);
  const agora = agoraTexto(ss);
  const u = gravarUsuario(abaU, {
    usuario: nome, nome: String(req.nome || '').trim().slice(0, 60) || nome, perfil: 'consulta', permissoes: permissoesEfetivas('consulta'),
    ativo: true, pendente: false, hash: protegerSenha(senha), sv: 1, criadoEm: agora, ultimoAcesso: agora
  });
  return { ok: true, usuario: publico(u), sessao: criarSessao(u, !!req.lembrar) };
}

function trocarSenha(abaU, quem, req) {
  if (quem.legado) throw erroAcesso('login', 'Entre com usuário e senha primeiro.');
  exigirTentativa(quem.usuario);
  if (!conferirSenha(String(req.atual || ''), quem.hash)) { contarFalha(quem.usuario); throw erroAcesso('credenciais', 'A senha atual não confere.'); }
  limparFalhas(quem.usuario);
  quem.hash = protegerSenha(validarSenhaNova(req.nova));
  quem.sv += 1; // encerra as sessões abertas em outros aparelhos
  gravarUsuario(abaU, quem);
  const s = lerSessao(req.sessao);
  return { ok: true, usuario: publico(quem), sessao: criarSessao(quem, !!(s && s.l)) };
}

function adminsAtivos(usuarios) { return usuarios.filter(function (x) { return x.ativo && x.perfil === 'admin'; }).length; }

function salvarUsuario(ss, abaU, usuarios, quem, req) {
  const d = req.usuario || {};
  const nome = normalizarUsuario(d.usuario);
  let u = usuarios.filter(function (x) { return x.usuario === nome; })[0];
  if (req.novo) {
    validarNomeUsuario(nome);
    if (u) throw erroAcesso('existe', 'Já existe um usuário "' + nome + '".');
    u = { usuario: nome, sv: 1, ativo: true, criadoEm: agoraTexto(ss), ultimoAcesso: '', hash: '' };
    usuarios.push(u);
    if (!d.senha) throw erroAcesso('senha', 'Defina uma senha para o novo usuário.');
  } else if (!u) throw erroAcesso('usuario', 'Usuário não encontrado.');

  const eraAtivo = u.ativo;
  u.nome = String(d.nome == null ? (u.nome || '') : d.nome).trim().slice(0, 60) || nome;
  u.perfil = PERFIS.hasOwnProperty(String(d.perfil)) ? String(d.perfil) : (u.perfil || 'consulta');
  u.permissoes = permissoesEfetivas(u.perfil, d.permissoes || []);
  u.ativo = d.ativo !== false;
  if (u.ativo) u.pendente = false; // aprovar um cadastro pendente é salvar como ativo
  if (u.usuario === quem.usuario && !u.ativo) throw erroAcesso('proprio', 'Você não pode desativar o seu próprio usuário.');
  if (!adminsAtivos(usuarios)) throw erroAcesso('admin', 'Precisa existir pelo menos um administrador ativo.');
  if (d.senha) { u.hash = protegerSenha(validarSenhaNova(d.senha)); if (!req.novo) u.sv += 1; }
  if (eraAtivo && !u.ativo) u.sv += 1;
  gravarUsuario(abaU, u);
  return { ok: true, usuario: publico(u) };
}

function excluirUsuario(abaU, usuarios, quem, req) {
  const nome = normalizarUsuario(req.usuario);
  const u = usuarios.filter(function (x) { return x.usuario === nome; })[0];
  if (!u) throw erroAcesso('usuario', 'Usuário não encontrado.');
  if (u.usuario === quem.usuario) throw erroAcesso('proprio', 'Você não pode excluir o seu próprio usuário.');
  if (!adminsAtivos(usuarios.filter(function (x) { return x !== u; }))) throw erroAcesso('admin', 'Precisa existir pelo menos um administrador ativo.');
  abaU.deleteRow(u.linha);
  return { ok: true, excluido: nome };
}

// ============================================================
//  PEDIDOS DE ENVIO
// ============================================================
const SIT_AGUARDANDO = 'AGUARDANDO', SIT_INCLUIDO = 'INCLUÍDO', SIT_CANCELADO = 'CANCELADO', SIT_RECUSADO = 'RECUSADO';

function podeAtenderPedidos(quem) { return quem.permissoes.indexOf('minutas.criar') >= 0 || quem.permissoes.indexOf('minutas.editar') >= 0; }

function textoLimpo(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }

function lerPedidos(ss) {
  const aba = obterAba(ss, ABA_PEDIDOS, CAB_PEDIDOS);
  const ultima = aba.getLastRow();
  if (ultima < 2) return { aba: aba, lista: [] };
  const lista = aba.getRange(2, 1, ultima - 1, CAB_PEDIDOS.length).getValues().map(function (r, i) {
    if (!r[0]) return null;
    return {
      linha: i + 2, id: String(r[0]), criadoEm: textoCelula(r[1], ss, 'dd/MM/yyyy HH:mm:ss'), usuario: String(r[2] || ''), nome: String(r[3] || ''),
      de: String(r[4] || ''), para: String(r[5] || ''), qtd: Number(r[6]) || 1, conteudo: String(r[7] || ''), obs: String(r[8] || ''),
      situacao: String(r[9] || SIT_AGUARDANDO).toUpperCase(), minuta: textoCelula(r[10], ss), atendidoPor: String(r[11] || ''),
      atendidoEm: textoCelula(r[12], ss, 'dd/MM/yyyy HH:mm:ss'), motivo: String(r[13] || '')
    };
  }).filter(function (x) { return x; });
  return { aba: aba, lista: lista };
}

function gravarPedido(aba, p) {
  const linha = p.linha || (aba.getLastRow() + 1);
  aba.getRange(linha, 1, 1, CAB_PEDIDOS.length).setNumberFormat('@').setValues([[
    p.id, p.criadoEm, p.usuario, p.nome, p.de, p.para, String(p.qtd), p.conteudo, p.obs, p.situacao, p.minuta || '', p.atendidoPor || '', p.atendidoEm || '', p.motivo || ''
  ]]);
  p.linha = linha;
  return p;
}

function pedidoPublico(p) {
  return { id: p.id, criadoEm: p.criadoEm, usuario: p.usuario, nome: p.nome, de: p.de, para: p.para, qtd: p.qtd, conteudo: p.conteudo, obs: p.obs,
    situacao: p.situacao, minuta: p.minuta, atendidoPor: p.atendidoPor, atendidoEm: p.atendidoEm, motivo: p.motivo };
}

function criarPedido(ss, quem, req) {
  const d = req.pedido || {};
  const de = textoLimpo(d.de, 80), para = textoLimpo(d.para, 80);
  if (!de) throw erroAcesso('pedido', 'Informe quem está enviando.');
  if (!para) throw erroAcesso('pedido', 'Informe para quem vai o envio.');
  const qtd = Math.floor(Number(d.qtd));
  if (!(qtd >= 1 && qtd <= 999)) throw erroAcesso('pedido', 'A quantidade deve ser de 1 a 999.');
  const dados = lerPedidos(ss);
  const usuario = quem.usuario || 'codigo';
  const abertos = dados.lista.filter(function (p) { return p.usuario === usuario && p.situacao === SIT_AGUARDANDO; }).length;
  if (abertos >= MAX_PEDIDOS_ABERTOS) throw erroAcesso('limite', 'Você já tem ' + abertos + ' pedidos aguardando. Espere alguns serem incluídos antes de lançar outros.');
  const p = gravarPedido(dados.aba, {
    id: 'P' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(),
    criadoEm: agoraTexto(ss), usuario: usuario, nome: quem.nome || usuario, de: de, para: para, qtd: qtd,
    conteudo: textoLimpo(d.conteudo, 30) || 'Envelope', obs: textoLimpo(d.obs, 200), situacao: SIT_AGUARDANDO
  });
  return { ok: true, pedido: pedidoPublico(p) };
}

// Quem monta minutas vê todos os pedidos aguardando e os atendidos recentemente;
// quem só pede vê os próprios.
function listarPedidos(ss, quem) {
  const atende = podeAtenderPedidos(quem);
  const meus = quem.permissoes.indexOf('pedidos.criar') >= 0;
  if (!atende && !meus) throw erroAcesso('permissao', 'Seu usuário não tem permissão para ver pedidos de envio.');
  const lista = lerPedidos(ss).lista;
  const usuario = quem.usuario || 'codigo';
  const aguardando = lista.filter(function (p) { return p.situacao === SIT_AGUARDANDO && (atende || p.usuario === usuario); });
  const outros = lista.filter(function (p) { return p.situacao !== SIT_AGUARDANDO && (atende || p.usuario === usuario); }).reverse().slice(0, atende ? 40 : 60);
  return { ok: true, podeAtender: atende, pedidos: aguardando.concat(outros).map(pedidoPublico) };
}

function cancelarPedido(ss, quem, req) {
  const dados = lerPedidos(ss);
  const p = dados.lista.filter(function (x) { return x.id === String(req.id || ''); })[0];
  if (!p) throw erroAcesso('pedido', 'Pedido não encontrado.');
  if (p.situacao !== SIT_AGUARDANDO) throw erroAcesso('pedido', 'Este pedido não está mais aguardando (' + p.situacao.toLowerCase() + ').');
  const meu = p.usuario === (quem.usuario || 'codigo');
  if (!meu && !podeAtenderPedidos(quem)) throw erroAcesso('permissao', 'Você só pode cancelar os seus próprios pedidos.');
  p.situacao = meu ? SIT_CANCELADO : SIT_RECUSADO;
  p.atendidoPor = quem.nome || quem.usuario || '';
  p.atendidoEm = agoraTexto(ss);
  p.motivo = meu ? '' : textoLimpo(req.motivo, 200);
  gravarPedido(dados.aba, p);
  return { ok: true, pedido: pedidoPublico(p) };
}

// Chamado ao registrar uma minuta: itens que vieram de um pedido marcam o pedido como incluído.
function marcarPedidosIncluidos(ss, itens, numeroTexto, quem) {
  const ids = itens.map(function (i) { return String(i.pedidoId || ''); }).filter(String);
  if (!ids.length) return 0;
  const dados = lerPedidos(ss);
  let n = 0;
  dados.lista.forEach(function (p) {
    if (ids.indexOf(p.id) < 0) return;
    if (p.situacao !== SIT_AGUARDANDO && !(p.situacao === SIT_INCLUIDO && normalizarNumero(p.minuta) === normalizarNumero(numeroTexto))) return;
    p.situacao = SIT_INCLUIDO; p.minuta = numeroTexto; p.atendidoPor = quem.nome || quem.usuario || ''; p.atendidoEm = agoraTexto(ss); p.motivo = '';
    gravarPedido(dados.aba, p); n++;
  });
  return n;
}

// Chamado ao excluir uma minuta: os pedidos dela voltam a aguardar.
function devolverPedidos(ss, num) {
  const dados = lerPedidos(ss);
  dados.lista.forEach(function (p) {
    if (p.situacao !== SIT_INCLUIDO || normalizarNumero(p.minuta) !== num) return;
    p.situacao = SIT_AGUARDANDO; p.minuta = ''; p.atendidoPor = ''; p.atendidoEm = '';
    gravarPedido(dados.aba, p);
  });
}
