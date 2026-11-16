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
 *   • Pedidos RECUSADOS ou CANCELADOS podem ser excluídos da aba por quem
 *     tem "Excluir pedidos" (o Administrador tem; os outros só se ele liberar).
 *   • Enquanto nenhum usuário existir, tudo funciona como antes
 *     (só com o código de acesso).
 *   • ESQUECI A SENHA DO ADMINISTRADOR: apague as linhas da aba
 *     "Usuarios" (deixe a linha 1) e refaça o primeiro acesso.
 *   • Não edite à mão as colunas "Senha (protegida)" e "Sessão".
 *
 *  AVISOS POR E-MAIL (versão 2.8):
 *   • Quando um pedido de envio é INCLUÍDO numa minuta ou RECUSADO, quem
 *     fez o pedido recebe um e-mail, se tiver e-mail no cadastro (coluna
 *     "E-mail" da aba Usuarios, preenchida em Usuários ou em Minha conta).
 *   • O TEXTO DO E-MAIL É EDITÁVEL NO PRÓPRIO GERADOR: Usuários › Aviso por
 *     e-mail › Editar modelo (só o Administrador). Lá dá para mudar assunto,
 *     textos, assinatura, rodapé e o que aparece no quadro, com prévia ao vivo.
 *     O modelo fica guardado neste script (Propriedades do script) e vale
 *     para todos os aparelhos. Os valores EMAIL_* abaixo são só o padrão
 *     usado enquanto ninguém salvou um modelo (ou em "Restaurar padrão").
 *   • O e-mail sai da conta Google dona deste script.
 *   • AUTORIZAR (uma vez, depois de colar esta versão): no editor do Apps
 *     Script, escolha a função testarEmail na barra de cima e clique em
 *     Executar. Autorize "Enviar e-mail como você". Chegam dois e-mails de
 *     exemplo na sua caixa. Depois publique a Nova versão normalmente.
 *   • Contas Gmail comuns enviam até 100 e-mails por dia; Google Workspace, 1.500.
 *
 *  VERSÃO 2.9:
 *   • COMENTÁRIOS: cada pedido de envio tem uma conversa (aba "Comentarios").
 *     Quem pediu comenta → avisa por e-mail quem monta o malote; quem monta
 *     comenta → avisa quem pediu.
 *   • LEMBRETE DE PEDIDO PARADO: pedidos aguardando há mais de N horas geram
 *     um e-mail para quem monta o malote (e de novo a cada N horas). Liga,
 *     desliga e muda as horas em Usuários › Aviso por e-mail › Editar modelo.
 *     A verificação acontece enquanto o app está em uso (a cada 30 min, no
 *     máximo). Para testar na hora, rode a função testarLembrete no editor.
 *   • REABRIR (3.0): pedido recusado ou cancelado pode voltar para a fila,
 *     para um malote posterior; fica na conversa e quem pediu recebe e-mail.
 *   • AUDITORIA: aba "Auditoria" com quem fez o quê e quando (entradas no
 *     sistema, minutas, pedidos, comentários, usuários, modelo de e-mail).
 *     Consulte em Usuários › Histórico de ações. Guarda as últimas 20 mil linhas.
 *
 *  E-MAILS CONFERIDOS E DESTINATÁRIOS (versão 3.1):
 *   • Nenhum e-mail sai mais sozinho. Cada aviso (pedido incluído, recusado,
 *     reaberto, comentário, lembrete) entra na aba "Emails" como PENDENTE e
 *     o Gerador abre a janela "Conferir e-mail": prévia da mensagem e a
 *     lista de destinatários para marcar. Só sai quando alguém clica Enviar.
 *   • Aba "Destinatarios": o cadastro de quem pode receber e-mail (nome,
 *     e-mail, setor e, opcional, o usuário do Gerador). Só quem está nesse
 *     cadastro pode ser marcado; não há caixa para digitar endereço.
 *     Gerencie no Gerador, tela Destinatários (permissão "Alterar cadastros").
 *   • Permissão nova "Conferir e enviar e-mails" (emails.enviar): vê e envia
 *     os e-mails pendentes de todos, inclusive o lembrete. Sem ela, a pessoa
 *     confere só os e-mails gerados pelas próprias ações.
 * ============================================================
 */

const CODIGO_ACESSO = 'TROQUE-ESTE-CODIGO';      // o mesmo código informado no Gerador
const NOME_PASTA_PDF = 'Minutas Quatro K - PDFs'; // criada ao lado desta planilha
const ABA_MINUTAS = 'Minutas';
const ABA_ITENS = 'Itens';
const ABA_USUARIOS = 'Usuarios';
const ABA_PEDIDOS = 'Pedidos';
const ABA_COMENTARIOS = 'Comentarios';
const ABA_AUDITORIA = 'Auditoria';
const ABA_DESTINATARIOS = 'Destinatarios';
const ABA_EMAILS = 'Emails';
const CAB_DESTINATARIOS = ['ID', 'Nome', 'E-mail', 'Setor', 'Usuário', 'Ativo', 'Criado em', 'Atualizado em'];
const CAB_EMAILS = ['ID', 'Criado em', 'Tipo', 'Situação', 'Gerado por', 'Nome', 'Resumo', 'Dados', 'Enviado por', 'Enviado em', 'Destinatários', 'Assunto'];
const CAB_COMENTARIOS = ['Pedido', 'Data', 'Usuário', 'Nome', 'Comentário'];
const CAB_AUDITORIA = ['Data', 'Usuário', 'Nome', 'Ação', 'Alvo', 'Detalhes'];
const MAX_AUDITORIA = 20000; // linhas guardadas na aba Auditoria (as mais antigas saem)
const VERSAO_SCRIPT = '3.1';

// ---------- Avisos por e-mail ----------
const EMAIL_ATIVO = true;                                  // false desliga todos os avisos
const EMAIL_NOME_REMETENTE = 'Expedição · Grupo Quatro K'; // nome que aparece como remetente
const EMAIL_RESPONDER_PARA = '';                           // e-mail para respostas; vazio = e-mail de quem atendeu o pedido (se tiver) ou a conta do script
const EMAIL_ASSINATURA = {
  nome: 'Equipe de Expedição',
  cargo: 'Expedição · Despacho',
  empresa: 'Grupo Quatro K',
  contato: ''                                              // ex.: '(47) 0000-0000 · expedicao@quatrok.com.br' (opcional)
};
const URL_APP = 'https://kuuhaku-vs.github.io/appquatrokminutas/';
const URL_LOGO_EMAIL = URL_APP + 'logo.png';
const CAB_MINUTAS = ['Minuta', 'Data', 'Volumes', 'Embalagem', 'Remetente', 'Destinatário', 'Qtd. itens', 'Pessoas', 'PDF', 'Atualizado em', 'Origem', 'Dados', 'Usuário'];
const CAB_PEDIDOS = ['ID', 'Criado em', 'Usuário', 'Nome', 'De', 'Para', 'Qtd.', 'Conteúdo', 'Obs.', 'Situação', 'Minuta', 'Atendido por', 'Atendido em', 'Motivo', 'Lembrete em'];
const MAX_PEDIDOS_ABERTOS = 30; // pedidos aguardando por pessoa
const CAB_USUARIOS = ['Usuário', 'Nome', 'Perfil', 'Permissões', 'Ativo', 'Senha (protegida)', 'Sessão', 'Criado em', 'Último acesso', 'E-mail'];

// O que cada usuário pode acessar e alterar. O perfil "admin" tem tudo.
const PERMISSOES = ['minutas.criar', 'minutas.editar', 'minutas.excluir', 'historico.ver', 'pedidos.criar', 'pedidos.excluir', 'frete.usar', 'cadastros.editar', 'emails.enviar', 'config.acessar', 'usuarios.gerenciar'];
const PERFIS = {
  admin: PERMISSOES,
  operador: ['minutas.criar', 'minutas.editar', 'historico.ver', 'frete.usar', 'cadastros.editar', 'emails.enviar'],
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
  let req = {}, ss = null;
  const ctx = { quem: null };
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    ss = SpreadsheetApp.getActiveSpreadsheet();
    const res = processar(req, ss, ctx);
    if (res && res.ok) auditar(ss, ctx.quem, req, res);
    verificarPedidosParadosSePreciso(ss); // lembrete de pedido parado (no máximo a cada 30 min)
    return resposta(res);
  } catch (err) {
    if (ss && req.acao === 'auth.login' && err && err.codigo === 'credenciais') {
      registrarAcao(ss, { usuario: normalizarUsuario(req.usuario).slice(0, 40), nome: '' }, 'Login recusado', '@' + normalizarUsuario(req.usuario).slice(0, 40), 'Usuário ou senha incorretos');
    }
    return resposta({ ok: false, codigo: (err && err.codigo) || undefined, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

// Executa a ação pedida e devolve o objeto de resposta (doPost cuida da auditoria e do envio).
function processar(req, ss, ctx) {
  {
    const abaU = obterAba(ss, ABA_USUARIOS, CAB_USUARIOS);
    const usuarios = lerUsuarios(abaU);

    // Ações de login (não exigem sessão).
    if (req.acao === 'auth.estado') return ({ ok: true, temUsuarios: usuarios.length > 0, cadastro: PERMITIR_CADASTRO });
    if (req.acao === 'auth.cadastrar') { const r = pedirCadastro(ss, abaU, usuarios, req); ctx.quem = r.usuario; return r; }
    if (req.acao === 'auth.primeiro') { const r = primeiroAcesso(ss, abaU, usuarios, req); ctx.quem = r.usuario; return r; }
    if (req.acao === 'auth.login') { const r = entrar(ss, abaU, usuarios, req); ctx.quem = r.usuario; return r; }

    // Daqui para baixo: só com sessão válida (ou com o código, enquanto não houver usuários).
    const quem = autenticar(req, usuarios);
    ctx.quem = quem;
    if (req.acao === 'auth.eu') return ({ ok: true, usuario: publico(quem), sessao: renovarSessao(quem, req.sessao) });
    if (req.acao === 'auth.senha') return (trocarSenha(abaU, quem, req));
    if (req.acao === 'auth.email') return (trocarEmail(abaU, quem, req));
    if (req.acao === 'pedidos.criar') { exigir(quem, 'pedidos.criar'); return (criarPedido(ss, quem, req)); }
    if (req.acao === 'pedidos.listar') return (listarPedidos(ss, quem));
    if (req.acao === 'pedidos.cancelar') return (cancelarPedido(ss, quem, req));
    if (req.acao === 'pedidos.excluir') { exigir(quem, 'pedidos.excluir'); return (excluirPedidos(ss, req)); }
    if (req.acao === 'pedidos.comentar') return (comentarPedido(ss, usuarios, quem, req));
    if (req.acao === 'pedidos.reabrir') return (reabrirPedido(ss, usuarios, quem, req));
    if (req.acao === 'usuarios.auditoria') { exigir(quem, 'usuarios.gerenciar'); return (lerAuditoria(ss, req)); }
    if (req.acao === 'usuarios.listar') { exigir(quem, 'usuarios.gerenciar'); return ({ ok: true, usuarios: usuarios.map(publico), permissoes: PERMISSOES, perfis: PERFIS }); }
    if (req.acao === 'usuarios.salvar') { exigir(quem, 'usuarios.gerenciar'); return (salvarUsuario(ss, abaU, usuarios, quem, req)); }
    if (req.acao === 'usuarios.emailmodelo') { exigir(quem, 'usuarios.gerenciar'); const mm = lerModeloEmail(); return ({ ok: true, modelo: mm.modelo, personalizado: mm.personalizado, padrao: modeloEmailPadrao() }); }
    if (req.acao === 'usuarios.emailsalvar') { exigir(quem, 'usuarios.gerenciar'); return (salvarModeloEmail(req)); }
    if (req.acao === 'usuarios.emailprevia') { exigir(quem, 'usuarios.gerenciar'); return (previaEmail(req, quem)); }
    if (req.acao === 'usuarios.emailteste') { exigir(quem, 'usuarios.gerenciar'); return (testeEmail(req, quem)); }
    if (req.acao === 'usuarios.excluir') { exigir(quem, 'usuarios.gerenciar'); return (excluirUsuario(abaU, usuarios, quem, req)); }
    // Cadastro de destinatários e e-mails conferidos antes do envio (versão 3.1).
    if (req.acao === 'destinatarios.listar') return ({ ok: true, destinatarios: lerDestinatarios(ss).lista.map(destinatarioPublico), podeEditar: quem.permissoes.indexOf('cadastros.editar') >= 0 });
    if (req.acao === 'destinatarios.salvar') { exigir(quem, 'cadastros.editar'); return (salvarDestinatario(ss, req)); }
    if (req.acao === 'destinatarios.excluir') { exigir(quem, 'cadastros.editar'); return (excluirDestinatario(ss, req)); }
    if (req.acao === 'destinatarios.importar') { exigir(quem, 'cadastros.editar'); return (importarDestinatarios(ss, usuarios)); }
    if (req.acao === 'emails.listar') return (listarEmails(ss, usuarios, quem));
    if (req.acao === 'emails.previa') return (previaEmailFila(ss, usuarios, quem, req));
    if (req.acao === 'emails.enviar') return (enviarEmailFila(ss, quem, req));
    if (req.acao === 'emails.descartar') return (descartarEmailFila(ss, quem, req));

    const abaM = obterAba(ss, ABA_MINUTAS, CAB_MINUTAS);
    const abaI = obterAba(ss, ABA_ITENS, CAB_ITENS);

    if (req.acao === 'teste') return ({ ok: true, versao: VERSAO_SCRIPT, planilha: ss.getName(), url: ss.getUrl() });

    if (req.acao === 'proximo') {
      const max = maiorNumero(abaM);
      return ({ ok: true, versao: VERSAO_SCRIPT, max: max, numero: preencher(max + 1, req.digitos), url: ss.getUrl() });
    }

    if (req.acao === 'listar') {
      exigir(quem, 'historico.ver');
      return ({ ok: true, versao: VERSAO_SCRIPT, url: ss.getUrl(), minutas: listarMinutas(ss, abaM, abaI) });
    }

    const m = req.minuta || {};
    const num = normalizarNumero(m.numero);
    if (!num) return ({ ok: false, error: 'Número de minuta inválido.' });

    if (req.acao === 'excluir') {
      exigir(quem, 'minutas.excluir');
      const r = removerLinhas(abaM, num, true);
      removerLinhas(abaI, num, false);
      if (r.qtd) devolverPedidos(ss, num);
      return ({ ok: true, removidas: r.qtd, numero: m.numero });
    }

    if (req.acao === 'registrar') {
      // Quando esta planilha é a base de dados, valida a sequência dentro do
      // bloqueio, para dois computadores nunca gravarem o mesmo número.
      if (req.validarSequencia && !req.revisao) {
        const max = maiorNumero(abaM);
        const proximo = preencher(max + 1, req.digitos);
        if (existeNumero(abaM, num)) return ({ ok: false, codigo: 'existe', proximo: proximo, error: 'A minuta nº ' + m.numero + ' já existe na planilha. Próximo número disponível: ' + proximo + '.' });
        if (Number(num) !== max + 1) return ({ ok: false, codigo: 'sequencia', proximo: proximo, error: 'A numeração foi alterada na planilha. Próximo número disponível: ' + proximo + '.' });
      }
      // Gravar por cima de uma minuta que já existe é "alterar"; número novo é "criar".
      const alterada = existeNumero(abaM, num);
      exigir(quem, alterada ? 'minutas.editar' : 'minutas.criar');
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
      const inc = marcarPedidosIncluidos(ss, itens, numeroTexto, quem);
      return ({ ok: true, pdf: linkPdf, url: ss.getUrl(), pedidosIncluidos: inc.qtd, emailsPendentes: inc.emails, alterada: alterada, qtdItens: itens.length });
    }

    return { ok: false, error: 'Ação desconhecida: ' + req.acao };
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
      criadoEm: textoCelula(r[7], ss, 'dd/MM/yyyy HH:mm:ss'), ultimoAcesso: textoCelula(r[8], ss, 'dd/MM/yyyy HH:mm:ss'),
      email: String(r[9] || '').trim()
    };
  }).filter(function (x) { return x; });
}

function gravarUsuario(abaU, u) {
  const linha = u.linha || (abaU.getLastRow() + 1);
  abaU.getRange(linha, 1, 1, CAB_USUARIOS.length).setNumberFormat('@').setValues([[
    u.usuario, u.nome, u.perfil, u.perfil === 'personalizado' ? u.permissoes.join(', ') : '', u.pendente ? 'PENDENTE' : (u.ativo ? 'SIM' : 'NÃO'),
    u.hash, String(u.sv), u.criadoEm || '', u.ultimoAcesso || '', u.email || ''
  ]]);
  u.linha = linha;
  return u;
}

function publico(u) {
  return { usuario: u.usuario, nome: u.nome, perfil: u.perfil, permissoes: u.permissoes, ativo: u.ativo !== false, pendente: !!u.pendente, criadoEm: u.criadoEm || '', ultimoAcesso: u.ultimoAcesso || '', email: u.email || '', legado: !!u.legado };
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
    usuario: validarNomeUsuario(req.usuario), nome: String(req.nome || '').trim() || 'Administrador', perfil: 'admin', permissoes: PERMISSOES.slice(), email: validarEmail(req.email),
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
    email: validarEmail(req.email), ativo: true, pendente: false, hash: protegerSenha(senha), sv: 1, criadoEm: agora, ultimoAcesso: agora
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

function validarEmail(v) {
  const email = String(v == null ? '' : v).trim().toLowerCase().slice(0, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw erroAcesso('email', 'E-mail inválido: ' + email);
  return email;
}

// A própria pessoa informa o e-mail onde quer receber os avisos dos pedidos de envio.
function trocarEmail(abaU, quem, req) {
  if (quem.legado) throw erroAcesso('login', 'Entre com usuário e senha primeiro.');
  quem.email = validarEmail(req.email);
  gravarUsuario(abaU, quem);
  return { ok: true, usuario: publico(quem) };
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
  if (d.email !== undefined) u.email = validarEmail(d.email);
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
      atendidoEm: textoCelula(r[12], ss, 'dd/MM/yyyy HH:mm:ss'), motivo: String(r[13] || ''),
      lembreteEm: textoCelula(r[14], ss, 'dd/MM/yyyy HH:mm:ss')
    };
  }).filter(function (x) { return x; });
  return { aba: aba, lista: lista };
}

function gravarPedido(aba, p) {
  const linha = p.linha || (aba.getLastRow() + 1);
  aba.getRange(linha, 1, 1, CAB_PEDIDOS.length).setNumberFormat('@').setValues([[
    p.id, p.criadoEm, p.usuario, p.nome, p.de, p.para, String(p.qtd), p.conteudo, p.obs, p.situacao, p.minuta || '', p.atendidoPor || '', p.atendidoEm || '', p.motivo || '', p.lembreteEm || ''
  ]]);
  p.linha = linha;
  return p;
}

function pedidoPublico(p, comentarios) {
  return { comentarios: comentarios || [], id: p.id, criadoEm: p.criadoEm, usuario: p.usuario, nome: p.nome, de: p.de, para: p.para, qtd: p.qtd, conteudo: p.conteudo, obs: p.obs,
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
  const exclui = quem.permissoes.indexOf('pedidos.excluir') >= 0;
  const atende = podeAtenderPedidos(quem) || exclui; // quem exclui precisa ver os pedidos de todos
  const meus = quem.permissoes.indexOf('pedidos.criar') >= 0;
  if (!atende && !meus) throw erroAcesso('permissao', 'Seu usuário não tem permissão para ver pedidos de envio.');
  const lista = lerPedidos(ss).lista;
  const usuario = quem.usuario || 'codigo';
  const aguardando = lista.filter(function (p) { return p.situacao === SIT_AGUARDANDO && (atende || p.usuario === usuario); });
  const outros = lista.filter(function (p) { return p.situacao !== SIT_AGUARDANDO && (atende || p.usuario === usuario); }).reverse().slice(0, atende ? 40 : 60);
  const coms = lerComentarios(ss);
  return { ok: true, podeAtender: podeAtenderPedidos(quem), podeExcluir: exclui,
    pedidos: aguardando.concat(outros).map(function (p) { return pedidoPublico(p, coms[p.id]); }) };
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
  const emails = p.situacao === SIT_RECUSADO ? avisarPedidosPorEmail(ss, [p], 'recusado', quem) : [];
  return { ok: true, pedido: pedidoPublico(p), emailsPendentes: emails };
}

// Chamado ao registrar uma minuta: itens que vieram de um pedido marcam o pedido como incluído.
function marcarPedidosIncluidos(ss, itens, numeroTexto, quem) {
  const ids = itens.map(function (i) { return String(i.pedidoId || ''); }).filter(String);
  if (!ids.length) return { qtd: 0, emails: [] };
  const dados = lerPedidos(ss);
  let n = 0;
  const novos = []; // só gera o aviso por e-mail na primeira inclusão (regravar a mesma minuta não gera de novo)
  dados.lista.forEach(function (p) {
    if (ids.indexOf(p.id) < 0) return;
    if (p.situacao !== SIT_AGUARDANDO && !(p.situacao === SIT_INCLUIDO && normalizarNumero(p.minuta) === normalizarNumero(numeroTexto))) return;
    if (p.situacao === SIT_AGUARDANDO) novos.push(p);
    p.situacao = SIT_INCLUIDO; p.minuta = numeroTexto; p.atendidoPor = quem.nome || quem.usuario || ''; p.atendidoEm = agoraTexto(ss); p.motivo = '';
    gravarPedido(dados.aba, p); n++;
  });
  const emails = novos.length ? avisarPedidosPorEmail(ss, novos, 'incluido', quem) : [];
  return { qtd: n, emails: emails };
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

// Remove da aba pedidos que foram recusados ou cancelados (os outros ficam como histórico).
function excluirPedidos(ss, req) {
  const ids = (Array.isArray(req.ids) ? req.ids : [req.id]).map(String).filter(String);
  if (!ids.length) throw erroAcesso('pedido', 'Nenhum pedido informado.');
  const dados = lerPedidos(ss);
  const alvo = dados.lista.filter(function (p) { return ids.indexOf(p.id) >= 0; });
  if (!alvo.length) throw erroAcesso('pedido', 'Pedido não encontrado.');
  const bloqueado = alvo.filter(function (p) { return p.situacao !== SIT_RECUSADO && p.situacao !== SIT_CANCELADO; })[0];
  if (bloqueado) throw erroAcesso('pedido', 'Só dá para excluir pedidos recusados ou cancelados. O pedido ' + bloqueado.de + ' → ' + bloqueado.para + ' está ' + bloqueado.situacao.toLowerCase() + '.');
  alvo.sort(function (a, b) { return b.linha - a.linha; }).forEach(function (p) { dados.aba.deleteRow(p.linha); });
  excluirComentarios(ss, alvo.map(function (p) { return p.id; }));
  return { ok: true, excluidos: alvo.length, pedidos: alvo.map(function (p) { return p.de + ' → ' + p.para + ' (' + p.situacao.toLowerCase() + ')'; }) };
}


// ============================================================
//  COMENTÁRIOS NOS PEDIDOS (versão 2.9)
// ============================================================
// Quem pediu e quem monta o malote conversam dentro do pedido.
function lerComentarios(ss) {
  const aba = obterAba(ss, ABA_COMENTARIOS, CAB_COMENTARIOS);
  const ultima = aba.getLastRow();
  const mapa = {};
  if (ultima < 2) return mapa;
  aba.getRange(2, 1, ultima - 1, CAB_COMENTARIOS.length).getValues().forEach(function (r) {
    if (!r[0]) return;
    (mapa[String(r[0])] = mapa[String(r[0])] || []).push({
      data: textoCelula(r[1], ss, 'dd/MM/yyyy HH:mm:ss'), usuario: String(r[2] || ''), nome: String(r[3] || ''), texto: String(r[4] || '')
    });
  });
  return mapa;
}

function excluirComentarios(ss, ids) {
  const aba = obterAba(ss, ABA_COMENTARIOS, CAB_COMENTARIOS);
  const ultima = aba.getLastRow();
  if (ultima < 2 || !ids.length) return;
  const col = aba.getRange(2, 1, ultima - 1, 1).getValues();
  for (let i = col.length - 1; i >= 0; i--) if (ids.indexOf(String(col[i][0])) >= 0) aba.deleteRow(i + 2);
}

// Quem monta o malote (sugeridos no e-mail; o e-mail de verdade vem do cadastro de destinatários).
function atendentesComEmail(usuarios) {
  return usuarios.filter(function (u) {
    return u.ativo && !u.pendente && (u.permissoes.indexOf('minutas.criar') >= 0 || u.permissoes.indexOf('minutas.editar') >= 0);
  });
}

function comentarPedido(ss, usuarios, quem, req) {
  const texto = String(req.texto == null ? '' : req.texto).replace(/\r/g, '').trim().slice(0, 500);
  if (!texto) throw erroAcesso('comentario', 'Escreva o comentário.');
  const dados = lerPedidos(ss);
  const p = dados.lista.filter(function (x) { return x.id === String(req.id || ''); })[0];
  if (!p) throw erroAcesso('pedido', 'Pedido não encontrado.');
  const eu = quem.usuario || 'codigo';
  const meu = p.usuario === eu;
  const atende = podeAtenderPedidos(quem) || quem.permissoes.indexOf('pedidos.excluir') >= 0;
  if (!meu && !atende) throw erroAcesso('permissao', 'Você só pode comentar nos seus próprios pedidos.');
  const aba = obterAba(ss, ABA_COMENTARIOS, CAB_COMENTARIOS);
  const c = { data: agoraTexto(ss), usuario: eu, nome: quem.nome || eu, texto: texto };
  aba.getRange(aba.getLastRow() + 1, 1, 1, CAB_COMENTARIOS.length).setNumberFormat('@').setValues([[p.id, c.data, c.usuario, c.nome, c.texto]]);
  const lista = lerComentarios(ss)[p.id] || [c];

  // Avisos: quem pediu comenta → quem monta o malote; quem monta comenta → quem pediu
  // e os outros atendentes que já conversaram neste pedido.
  let destinos = [];
  if (meu) destinos = atendentesComEmail(usuarios);
  else {
    const dono = usuarios.filter(function (u) { return u.usuario === p.usuario; })[0];
    if (dono) destinos.push(dono);
    const conversaram = lista.map(function (x) { return x.usuario; });
    atendentesComEmail(usuarios).forEach(function (u) { if (conversaram.indexOf(u.usuario) >= 0) destinos.push(u); });
  }
  const vistos = {};
  destinos = destinos.filter(function (u) { if (!u || u.ativo === false || u.usuario === eu || vistos[u.usuario]) return false; vistos[u.usuario] = 1; return true; });
  // O e-mail não sai sozinho: fica pendente para quem comentou conferir a mensagem e marcar os destinatários.
  const emails = [];
  try {
    const id = enfileirarEmail(ss, 'comentario', [p], quem, { autor: c.nome, comentario: texto }, destinos);
    if (id) emails.push(id);
  } catch (err) { console.error('Aviso de comentário não gerado: ' + ((err && err.message) || err)); }
  return { ok: true, comentario: c, comentarios: lista, pedido: pedidoPublico(p, lista), emailsPendentes: emails };
}

// ============================================================
//  REABRIR PEDIDO (versão 3.0)
// ============================================================
// Pedido recusado (ou cancelado) volta para a fila, para entrar num malote posterior.
// Fica registrado na conversa do pedido e quem pediu recebe um e-mail.
function reabrirPedido(ss, usuarios, quem, req) {
  const dados = lerPedidos(ss);
  const p = dados.lista.filter(function (x) { return x.id === String(req.id || ''); })[0];
  if (!p) throw erroAcesso('pedido', 'Pedido não encontrado.');
  if (p.situacao !== SIT_RECUSADO && p.situacao !== SIT_CANCELADO) throw erroAcesso('pedido', 'Só dá para reabrir pedidos recusados ou cancelados. Este está ' + p.situacao.toLowerCase() + '.');
  const eu = quem.usuario || 'codigo';
  const meu = p.usuario === eu;
  const atende = podeAtenderPedidos(quem);
  if (!atende && !(meu && p.situacao === SIT_CANCELADO)) throw erroAcesso('permissao', 'Só quem monta o malote pode reabrir um pedido recusado.');
  const abertos = dados.lista.filter(function (x) { return x.usuario === p.usuario && x.situacao === SIT_AGUARDANDO; }).length;
  if (abertos >= MAX_PEDIDOS_ABERTOS) throw erroAcesso('limite', p.nome + ' já tem ' + abertos + ' pedidos aguardando.');
  const anterior = p.situacao, motivoAnterior = p.motivo;
  const nota = textoLimpo(req.nota, 300);
  const agora = agoraTexto(ss);
  p.situacao = SIT_AGUARDANDO; p.minuta = ''; p.motivo = '';
  p.atendidoPor = quem.nome || eu; p.atendidoEm = agora; // quem reabriu e quando (aparece no e-mail)
  p.lembreteEm = agora; // o lembrete de pedido parado conta a partir de agora
  gravarPedido(dados.aba, p);
  // Registro na conversa do pedido.
  const aba = obterAba(ss, ABA_COMENTARIOS, CAB_COMENTARIOS);
  const texto = '↺ Reabriu o pedido para um envio posterior' + (anterior === SIT_RECUSADO ? ' (estava recusado' + (motivoAnterior ? ': ' + motivoAnterior : '') + ')' : ' (estava cancelado)') + '.' + (nota ? '\n' + nota : '');
  aba.getRange(aba.getLastRow() + 1, 1, 1, CAB_COMENTARIOS.length).setNumberFormat('@').setValues([[p.id, agora, eu, quem.nome || eu, texto]]);
  const lista = lerComentarios(ss)[p.id] || [];
  const emails = [];
  if (!meu) {
    try {
      const dono = usuarios.filter(function (u) { return u.usuario === p.usuario; })[0];
      const id = enfileirarEmail(ss, 'reaberto', [p], quem, { nota: nota }, dono ? [dono] : [{ usuario: p.usuario, nome: p.nome }]);
      if (id) emails.push(id);
    } catch (err) { console.error('Aviso de pedido reaberto não gerado: ' + ((err && err.message) || err)); }
  }
  return { ok: true, pedido: pedidoPublico(p, lista), anterior: anterior, nota: nota, emailsPendentes: emails };
}

// ============================================================
//  LEMBRETE DE PEDIDO PARADO (versão 2.9)
// ============================================================
// Pedidos aguardando há mais de N horas geram um e-mail para quem monta o malote,
// e de novo a cada N horas enquanto continuarem parados. A verificação roda junto
// com o uso normal do app (no máximo a cada 30 minutos), sem gatilho extra.
function lerDataTexto(txt) {
  const t = String(txt || '').trim();
  if (!t) return null;
  try { return Utilities.parseDate(t, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'); } catch (e) { return null; }
}

function verificarPedidosParadosSePreciso(ss) {
  try {
    const props = PropertiesService.getScriptProperties();
    const ultima = Number(props.getProperty('LEMBRETE_ULTIMA_VERIFICACAO')) || 0;
    if (Date.now() - ultima < 30 * 60 * 1000) return 0;
    props.setProperty('LEMBRETE_ULTIMA_VERIFICACAO', String(Date.now()));
    return verificarPedidosParados(ss);
  } catch (err) { console.error('Lembrete de pedido parado: ' + ((err && err.message) || err)); return 0; }
}

function verificarPedidosParados(ss) {
  const modelo = lerModeloEmail().modelo;
  if (!modelo.ativo || !modelo.lembrete.ativo) return 0;
  const horas = Math.max(1, Math.min(720, Number(String(modelo.lembrete.horas).replace(',', '.')) || 24));
  const limite = horas * 3600 * 1000, agora = Date.now();
  const dados = lerPedidos(ss);
  const parados = dados.lista.filter(function (p) {
    if (p.situacao !== SIT_AGUARDANDO) return false;
    const base = lerDataTexto(p.lembreteEm) || lerDataTexto(p.criadoEm);
    return base && agora - base.getTime() >= limite;
  });
  if (!parados.length) return 0;
  const usuarios = lerUsuarios(obterAba(ss, ABA_USUARIOS, CAB_USUARIOS));
  const destinos = atendentesComEmail(usuarios);
  // Não envia: deixa (ou atualiza) um e-mail pendente para quem tem "Conferir e enviar e-mails".
  const id = enfileirarEmail(ss, 'lembrete', parados.slice(0, 60), null, { horas: String(horas), total: String(parados.length) }, destinos);
  const marca = agoraTexto(ss);
  parados.forEach(function (p) { p.lembreteEm = marca; gravarPedido(dados.aba, p); });
  registrarAcao(ss, { usuario: 'sistema', nome: 'Sistema' }, 'Lembrete de pedido parado', parados.length + (parados.length === 1 ? ' pedido' : ' pedidos'),
    id ? 'E-mail aguardando conferência na tela Destinatários' : 'Avisos por e-mail desligados');
  return id ? 1 : 0;
}

// Para rodar pelo editor (Executar) e ver o lembrete na hora, sem esperar os 30 minutos.
function testarLembrete() {
  const n = verificarPedidosParados(SpreadsheetApp.getActiveSpreadsheet());
  console.log(n ? 'Lembrete criado: confira e envie no Gerador, tela Destinatários › E-mails para conferir.' : 'Nenhum pedido parado há mais tempo que o configurado (ou lembrete desligado).');
}

// ============================================================
//  AUDITORIA · HISTÓRICO DE AÇÕES (versão 2.9)
// ============================================================
function registrarAcao(ss, quem, acao, alvo, detalhes) {
  try {
    const aba = obterAba(ss, ABA_AUDITORIA, CAB_AUDITORIA);
    aba.appendRow([agoraTexto(ss), (quem && quem.usuario) || '', (quem && quem.nome) || '', String(acao || ''), String(alvo || '').slice(0, 200), String(detalhes || '').slice(0, 500)]);
    const sobra = aba.getLastRow() - 1 - MAX_AUDITORIA;
    if (sobra > 50) aba.deleteRows(2, sobra);
  } catch (err) { console.error('Auditoria: ' + ((err && err.message) || err)); }
}

// Traduz cada ação que muda alguma coisa numa linha da aba Auditoria.
function auditar(ss, quem, req, res) {
  const a = req.acao || '';
  const ped = res.pedido ? res.pedido.de + ' → ' + res.pedido.para : '';
  const m = req.minuta || {};
  let linha = null;
  if (a === 'auth.login') linha = ['Entrou no sistema', '', req.lembrar ? 'Manter conectado' : ''];
  else if (a === 'auth.cadastrar') linha = ['Criou o próprio cadastro', '@' + (res.usuario && res.usuario.usuario), 'Perfil Consulta'];
  else if (a === 'auth.primeiro') linha = ['Criou o administrador (primeiro acesso)', '@' + (res.usuario && res.usuario.usuario), ''];
  else if (a === 'auth.senha') linha = ['Trocou a própria senha', '', ''];
  else if (a === 'auth.email') linha = ['Alterou o e-mail de avisos', '', req.email ? String(req.email) : 'E-mail removido'];
  else if (a === 'pedidos.criar') linha = ['Criou pedido de envio', ped, res.pedido.qtd + ' × ' + res.pedido.conteudo + (res.pedido.obs ? ' · ' + res.pedido.obs : '')];
  else if (a === 'pedidos.cancelar') linha = res.pedido.situacao === SIT_RECUSADO
    ? ['Recusou pedido de envio', ped, 'Pedido de ' + res.pedido.nome + (res.pedido.motivo ? ' · Motivo: ' + res.pedido.motivo : '')]
    : ['Cancelou pedido de envio', ped, ''];
  else if (a === 'pedidos.excluir') linha = ['Excluiu pedidos de envio', res.excluidos + (res.excluidos === 1 ? ' pedido' : ' pedidos'), (res.pedidos || []).join(' · ')];
  else if (a === 'pedidos.comentar') linha = ['Comentou no pedido', ped, res.comentario ? res.comentario.texto : ''];
  else if (a === 'pedidos.reabrir') linha = ['Reabriu pedido de envio', ped, 'Estava ' + String(res.anterior || '').toLowerCase() + ' · pedido de ' + res.pedido.nome + (res.nota ? ' · ' + res.nota : '')];
  else if (a === 'usuarios.salvar') {
    const u = res.usuario || {}, d = req.usuario || {};
    linha = [req.novo ? 'Criou usuário' : 'Alterou usuário', '@' + u.usuario,
      [({ admin: 'Administrador', operador: 'Operador', consulta: 'Consulta', personalizado: 'Personalizado' })[u.perfil] || u.perfil, u.ativo ? 'ativo' : 'desativado', d.senha ? (req.novo ? 'senha definida' : 'senha redefinida') : '', u.email ? 'e-mail ' + u.email : ''].filter(String).join(' · ')];
  }
  else if (a === 'usuarios.excluir') linha = ['Excluiu usuário', '@' + res.excluido, ''];
  else if (a === 'usuarios.emailsalvar') linha = [req.restaurar ? 'Restaurou o modelo de e-mail padrão' : 'Alterou o modelo de e-mail', '', res.modelo ? (res.modelo.ativo ? 'Avisos ligados' : 'Avisos desligados') + ' · lembrete ' + (res.modelo.lembrete.ativo ? 'a cada ' + res.modelo.lembrete.horas + ' h' : 'desligado') : ''];
  else if (a === 'usuarios.emailteste') linha = ['Enviou e-mail de teste', res.para || '', ''];
  else if (a === 'destinatarios.salvar') linha = [req.novo ? 'Cadastrou destinatário de e-mail' : 'Alterou destinatário de e-mail', res.destinatario ? res.destinatario.nome : '', res.destinatario ? res.destinatario.email + (res.destinatario.ativo ? '' : ' · inativo') : ''];
  else if (a === 'destinatarios.excluir') linha = ['Excluiu destinatário de e-mail', res.excluido || '', ''];
  else if (a === 'destinatarios.importar') linha = ['Importou destinatários de e-mail', res.importados + (res.importados === 1 ? ' destinatário' : ' destinatários'), 'Usuários com e-mail'];
  else if (a === 'emails.enviar') linha = ['Enviou e-mail conferido', res.assunto || '', 'Para ' + (res.para || []).join(', ')];
  else if (a === 'emails.descartar') linha = ['Descartou e-mail sem enviar', res.assunto || res.resumo || '', ''];
  else if (a === 'registrar') linha = [res.alterada ? 'Alterou minuta' : 'Registrou minuta', 'Minuta nº ' + m.numero,
    [res.qtdItens + (res.qtdItens === 1 ? ' item' : ' itens'), m.destinatario ? 'para ' + m.destinatario : '', res.pedidosIncluidos ? res.pedidosIncluidos + ' pedido(s) incluído(s)' : '', req.pdf && req.pdf.base64 ? 'com PDF' : ''].filter(String).join(' · ')];
  else if (a === 'excluir') linha = ['Excluiu minuta', 'Minuta nº ' + (res.numero || m.numero), res.removidas ? '' : 'Não estava na planilha'];
  if (linha) registrarAcao(ss, quem, linha[0], linha[1], linha[2]);
}

function lerAuditoria(ss, req) {
  const aba = obterAba(ss, ABA_AUDITORIA, CAB_AUDITORIA);
  const ultima = aba.getLastRow();
  if (ultima < 2) return { ok: true, registros: [], total: 0 };
  const ler = Math.min(ultima - 1, 5000);
  const linhas = aba.getRange(ultima - ler + 1, 1, ler, CAB_AUDITORIA.length).getValues().reverse();
  const busca = String(req.busca || '').trim().toLowerCase();
  const grupo = String(req.grupo || '');
  const grupos = {
    acesso: /entrou|login|cadastro|administrador|senha|e-mail de avisos/i,
    minutas: /minuta/i,
    pedidos: /pedido|comentou|lembrete/i,
    usuarios: /usuário/i,
    email: /modelo de e-mail|e-mail de teste|e-mail conferido|e-mail sem enviar|destinatário/i
  };
  const limite = Math.max(20, Math.min(1000, Number(req.limite) || 300));
  const out = [];
  for (let i = 0; i < linhas.length && out.length < limite; i++) {
    const r = linhas[i];
    const reg = { data: textoCelula(r[0], ss, 'dd/MM/yyyy HH:mm:ss'), usuario: String(r[1] || ''), nome: String(r[2] || ''), acao: String(r[3] || ''), alvo: String(r[4] || ''), detalhes: String(r[5] || '') };
    if (grupo && grupos[grupo] && !grupos[grupo].test(reg.acao)) continue;
    if (busca && [reg.data, reg.usuario, reg.nome, reg.acao, reg.alvo, reg.detalhes].join(' ').toLowerCase().indexOf(busca) < 0) continue;
    out.push(reg);
  }
  return { ok: true, registros: out, total: ultima - 1 };
}

// ============================================================
//  AVISOS POR E-MAIL (pedido incluído na minuta ou recusado)
// ============================================================
const CHAVE_MODELO_EMAIL = 'EMAIL_MODELO_V1';

// Modelo padrão. Campos de texto aceitam:
//   {primeiro_nome} {nome} {usuario} {email} {minuta} {o_seu_pedido} {atendente} {data} {de} {para} {motivo}
//   {autor} {comentario} (comentário) · {horas} {total} (lembrete) · {nota} (reaberto)
//   **texto** = negrito · linha em branco = novo parágrafo · campo vazio = não aparece no e-mail.
function modeloEmailPadrao() {
  return {
    ativo: EMAIL_ATIVO,
    remetente: EMAIL_NOME_REMETENTE,
    responderPara: EMAIL_RESPONDER_PARA,
    faixa: 'Expedição · Pedidos de envio',
    mostrarLogo: true,
    saudacao: 'Olá, {primeiro_nome},',
    incluido: {
      assunto: 'Pedido de envio incluído na minuta nº {minuta}',
      abertura: 'Informamos que {o_seu_pedido} foi incluído na **minuta de despacho nº {minuta}** e seguirá no malote correspondente.',
      selo: 'INCLUÍDO',
      linhaAtendente: 'Incluído por **{atendente}** em {data}.',
      fechamento: 'Caso precise de alguma alteração, responda a este e-mail ou entre em contato com a equipe de Expedição o quanto antes.'
    },
    recusado: {
      assunto: 'Pedido de envio não incluído: {de} → {para}',
      abertura: 'Informamos que {o_seu_pedido} **não pôde ser incluído** no malote. Confira abaixo os detalhes e o motivo informado.',
      selo: 'RECUSADO',
      linhaAtendente: 'Analisado por **{atendente}** em {data}.',
      fechamento: 'Se ainda for necessário, você pode lançar um novo pedido no Gerador de Minutas ou responder a este e-mail para combinar o envio.'
    },
    reaberto: {
      assunto: 'Seu pedido de envio voltou para a fila: {de} → {para}',
      abertura: 'Informamos que {o_seu_pedido} foi **reaberto** e voltou para a fila de envio. Ele será incluído em um próximo malote.',
      selo: 'REABERTO',
      linhaAtendente: 'Reaberto por **{atendente}** em {data}.',
      fechamento: 'Se o envio não for mais necessário, cancele o pedido no Gerador de Minutas, na tela **Envio**.'
    },
    comentario: {
      assunto: 'Novo comentário no pedido de envio: {de} → {para}',
      abertura: '**{autor}** comentou no pedido de envio abaixo.',
      selo: 'COMENTÁRIO',
      linhaAtendente: '',
      fechamento: 'Para responder, abra o Gerador de Minutas na tela **Envio** e clique em **Comentários** no pedido.'
    },
    lembrete: {
      ativo: true,
      horas: '24',
      assunto: 'Pedidos de envio aguardando há mais de {horas} h ({total})',
      abertura: 'Os pedidos de envio abaixo estão aguardando inclusão no malote há mais de **{horas} horas**.',
      selo: 'AGUARDANDO',
      linhaAtendente: '',
      fechamento: 'Inclua os pedidos na próxima minuta ou recuse com um motivo. Este lembrete se repete a cada {horas} horas enquanto houver pedido parado.'
    },
    campos: { minuta: true, de: true, para: true, quantidade: true, observacao: true, pedidoEm: true, motivo: true },
    botao: { mostrar: true, texto: 'Abrir o Gerador de Minutas' },
    despedida: 'Atenciosamente,',
    assinatura: [EMAIL_ASSINATURA.nome, EMAIL_ASSINATURA.cargo, EMAIL_ASSINATURA.empresa, EMAIL_ASSINATURA.contato].filter(String).join('\n'),
    rodape: 'Mensagem enviada pelo Gerador de Minutas · ' + EMAIL_ASSINATURA.empresa + ' para **{nome}** ({email}).'
  };
}

// Junta o modelo salvo com o padrão (campos novos de versões futuras ganham o valor padrão).
function mesclarModelo(base, salvo) {
  const out = {};
  Object.keys(base).forEach(function (k) {
    const b = base[k], v = salvo ? salvo[k] : undefined;
    if (b && typeof b === 'object' && !Array.isArray(b)) out[k] = mesclarModelo(b, v && typeof v === 'object' ? v : {});
    else if (v === undefined || v === null) out[k] = b;
    else if (typeof b === 'boolean') out[k] = !!v;
    else out[k] = String(v).slice(0, 2000);
  });
  return out;
}

function lerModeloEmail() {
  let salvo = null;
  try { salvo = JSON.parse(PropertiesService.getScriptProperties().getProperty(CHAVE_MODELO_EMAIL) || 'null'); } catch (e) { salvo = null; }
  return { modelo: mesclarModelo(modeloEmailPadrao(), salvo), personalizado: !!salvo };
}

function salvarModeloEmail(req) {
  if (req.restaurar) {
    PropertiesService.getScriptProperties().deleteProperty(CHAVE_MODELO_EMAIL);
    return { ok: true, modelo: modeloEmailPadrao(), personalizado: false, padrao: modeloEmailPadrao() };
  }
  const m = mesclarModelo(modeloEmailPadrao(), req.modelo || {});
  if (m.responderPara) m.responderPara = validarEmail(m.responderPara);
  if (!String(m.remetente).trim()) m.remetente = EMAIL_NOME_REMETENTE;
  if (TIPOS_EMAIL.some(function (t) { return !String(m[t].assunto).trim(); })) throw erroAcesso('email', 'O assunto do e-mail não pode ficar vazio.');
  const h = Number(String(m.lembrete.horas).replace(',', '.'));
  if (!(h >= 1 && h <= 720)) throw erroAcesso('email', 'O lembrete precisa de um tempo entre 1 e 720 horas.');
  m.lembrete.horas = String(Math.round(h * 10) / 10);
  PropertiesService.getScriptProperties().setProperty(CHAVE_MODELO_EMAIL, JSON.stringify(m));
  return { ok: true, modelo: m, personalizado: true, padrao: modeloEmailPadrao() };
}

const TIPOS_EMAIL = ['incluido', 'recusado', 'reaberto', 'comentario', 'lembrete'];

// Pedido de exemplo para a prévia e o e-mail de teste.
function exemploEmail(tipo, quem, modelo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const agora = agoraTexto(ss);
  const dono = { usuario: (quem && quem.usuario) || 'maria.silva', nome: (quem && quem.nome) || 'Maria Silva', email: (quem && quem.email) || 'maria.silva@exemplo.com.br' };
  const p = { criadoEm: agora, atendidoEm: agora, de: 'Mariana - Comercial', para: 'Sheila - Recepção SCS', qtd: 2, conteudo: 'Envelope', obs: 'Entregar em mãos', nome: 'Mariana Souza',
    minuta: tipo === 'incluido' ? '000123' : '', motivo: tipo === 'recusado' ? 'Vai pelo correio nesta semana.' : '' };
  const pedidos = [p];
  if (tipo === 'lembrete') pedidos.push({ criadoEm: agora, de: 'Eduardo - Laboratório', para: 'Paulo - Filial Sul', qtd: 1, conteudo: 'Caixa', obs: '', nome: 'Eduardo Lima' });
  const horas = (modelo && modelo.lembrete && modelo.lembrete.horas) || '24';
  const extra = tipo === 'comentario' ? { autor: 'Mariana Souza', comentario: 'Consegue ir no malote de amanhã cedo? É urgente.' }
    : tipo === 'reaberto' ? { nota: 'Vai no malote de segunda-feira.' }
    : tipo === 'lembrete' ? { horas: horas, total: String(pedidos.length) } : {};
  return { dono: dono, pedidos: pedidos, quem: { nome: (quem && quem.nome) || 'Expedição', email: '' }, extra: extra };
}

function previaEmail(req, quem) {
  const tipo = TIPOS_EMAIL.indexOf(req.tipo) >= 0 ? req.tipo : 'incluido';
  const modelo = mesclarModelo(modeloEmailPadrao(), req.modelo || lerModeloEmail().modelo);
  const ex = exemploEmail(tipo, quem, modelo);
  const msg = montarEmailPedido(tipo, ex.dono, ex.pedidos, ex.quem, modelo, ex.extra);
  return { ok: true, assunto: msg.assunto, html: msg.html, texto: msg.texto };
}

function testeEmail(req, quem) {
  const para = (quem && quem.email) || Session.getEffectiveUser().getEmail();
  if (!para) throw erroAcesso('email', 'Cadastre o seu e-mail em Minha conta para receber o teste.');
  const modelo = mesclarModelo(modeloEmailPadrao(), req.modelo || lerModeloEmail().modelo);
  const tipos = TIPOS_EMAIL.indexOf(req.tipo) >= 0 ? [req.tipo] : TIPOS_EMAIL;
  tipos.forEach(function (tipo) {
    const ex = exemploEmail(tipo, quem, modelo);
    const msg = montarEmailPedido(tipo, ex.dono, ex.pedidos, ex.quem, modelo, ex.extra);
    MailApp.sendEmail(para, '[TESTE] ' + msg.assunto, msg.texto, { name: modelo.remetente || EMAIL_NOME_REMETENTE, htmlBody: msg.html });
  });
  return { ok: true, para: para, enviados: tipos.length, cota: MailApp.getRemainingDailyQuota() };
}

// Um e-mail por pessoa que pediu: se vários pedidos dela entram na mesma minuta, vão juntos.
// Não envia: cada e-mail fica PENDENTE na aba Emails até alguém conferir e clicar Enviar.
// Nunca derruba a gravação: qualquer falha fica só no registro de execução.
function avisarPedidosPorEmail(ss, pedidos, tipo, quem) {
  const ids = [];
  if (!pedidos || !pedidos.length) return ids;
  try {
    const usuarios = lerUsuarios(obterAba(ss, ABA_USUARIOS, CAB_USUARIOS));
    const porUsuario = {};
    pedidos.forEach(function (p) { (porUsuario[p.usuario] = porUsuario[p.usuario] || []).push(p); });
    Object.keys(porUsuario).forEach(function (login) {
      const dono = usuarios.filter(function (u) { return u.usuario === login; })[0] || { usuario: login, nome: porUsuario[login][0].nome };
      const id = enfileirarEmail(ss, tipo, porUsuario[login], quem, {}, [dono]);
      if (id) ids.push(id);
    });
  } catch (err) {
    console.error('Aviso por e-mail não gerado: ' + ((err && err.message) || err));
  }
  return ids;
}

function escHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

function primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || 'colaborador(a)'; }

// Troca {variáveis} pelo valor (texto puro).
function preencherVars(txt, vars) {
  return String(txt == null ? '' : txt).replace(/\{([a-z_]+)\}/gi, function (m, k) { return Object.prototype.hasOwnProperty.call(vars, k.toLowerCase()) ? vars[k.toLowerCase()] : m; });
}
// Texto do modelo → HTML: escapa, troca variáveis, **negrito**, parágrafos e quebras de linha.
function textoParaHtml(txt, vars, estiloP) {
  const t = preencherVars(txt, vars).trim();
  if (!t) return '';
  return t.split(/\n\s*\n/).map(function (par) {
    const h = escHtml(par.trim()).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    return '<p style="' + estiloP + '">' + h + '</p>';
  }).join('');
}
// Texto do modelo → texto simples (versão sem formatação do e-mail).
function textoParaTexto(txt, vars) { return preencherVars(txt, vars).replace(/\*\*(.+?)\*\*/g, '$1').trim(); }

function montarEmailPedido(tipo, dono, pedidos, quem, modelo, extra) {
  modelo = modelo || lerModeloEmail().modelo;
  extra = extra || {};
  if (TIPOS_EMAIL.indexOf(tipo) < 0) tipo = 'incluido';
  const incluido = tipo === 'incluido', recusado = tipo === 'recusado';
  const t = modelo[tipo];
  const c = modelo.campos;
  const p0 = pedidos[0];
  const varios = pedidos.length > 1;
  const vars = {
    primeiro_nome: primeiroNome(dono.nome), nome: dono.nome || dono.usuario || '', usuario: dono.usuario || String(dono.email || '').split('@')[0], email: dono.email || '',
    minuta: p0.minuta || '', o_seu_pedido: varios ? 'os seus pedidos de envio' : 'o seu pedido de envio',
    atendente: (quem && (quem.nome || quem.usuario)) || p0.atendidoPor || '', data: p0.atendidoEm || '',
    de: p0.de || '', para: p0.para || '', motivo: p0.motivo || 'Não informado',
    autor: extra.autor || '', comentario: extra.comentario || '', nota: extra.nota || '', horas: extra.horas || (modelo.lembrete && modelo.lembrete.horas) || '', total: extra.total || String(pedidos.length)
  };
  const cor = { incluido: '#16794c', recusado: '#b42318', reaberto: '#6d28d9', comentario: '#2563eb', lembrete: '#b45309' }[tipo];
  const estiloP = 'margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;';

  const assunto = textoParaTexto(t.assunto, vars).replace(/\s+/g, ' ') || 'Pedido de envio';

  const linha = function (rot, val) {
    if (val === '' || val == null) return '';
    return '<tr><td style="padding:6px 12px 6px 0;color:#5b6475;font-size:13px;white-space:nowrap;vertical-align:top;">' + escHtml(rot) + '</td>' +
      '<td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;vertical-align:top;">' + escHtml(val) + '</td></tr>';
  };
  const detalhes = function (p) {
    return [
      c.minuta && p.minuta ? ['Minuta nº', p.minuta] : null,
      (tipo === 'comentario' || tipo === 'lembrete') && p.nome ? ['Pedido por', p.nome] : null,
      c.de ? ['De', p.de] : null,
      c.para ? ['Para', p.para] : null,
      c.quantidade ? ['Quantidade', p.qtd + ' · ' + p.conteudo] : null,
      c.observacao ? ['Observação', p.obs] : null,
      c.pedidoEm ? ['Pedido em', p.criadoEm] : null,
      recusado && c.motivo ? ['Motivo', p.motivo || 'Não informado'] : null
    ].filter(function (x) { return x && x[1] !== '' && x[1] != null; });
  };
  const selo = String(t.selo || '').trim();
  const cartoes = pedidos.map(function (p) {
    const ds = detalhes(p);
    if (!ds.length && !selo) return '';
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e7ee;border-radius:10px;margin:0 0 12px;background:#f8fafc;">' +
      '<tr><td style="padding:14px 16px;">' +
      (selo ? '<div style="margin:0 0 8px;"><span style="display:inline-block;padding:3px 10px;border-radius:99px;background:' + cor + ';color:#ffffff;font-size:11px;font-weight:700;letter-spacing:.04em;">' + escHtml(selo) + '</span></div>' : '') +
      '<table role="presentation" cellpadding="0" cellspacing="0">' + ds.map(function (d) { return linha(d[0], d[1]); }).join('') + '</table></td></tr></table>';
  }).join('');
  // Comentário em destaque, logo abaixo do quadro.
  const citacao = tipo === 'comentario' && vars.comentario ? { quem: vars.autor + ' escreveu', txt: vars.comentario, fundo: '#eff6ff' }
    : tipo === 'reaberto' && vars.nota ? { quem: 'Observação de ' + (vars.atendente || 'quem reabriu'), txt: vars.nota, fundo: '#f5f3ff' } : null;
  const blocoComentario = citacao
    ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;"><tr><td style="border-left:3px solid ' + cor + ';background:' + citacao.fundo + ';border-radius:0 10px 10px 0;padding:12px 16px;">' +
      '<div style="font-size:11px;font-weight:700;letter-spacing:.04em;color:#5b6475;text-transform:uppercase;margin-bottom:4px;">' + escHtml(citacao.quem) + '</div>' +
      '<div style="font-size:14px;line-height:1.55;color:#111827;">' + escHtml(citacao.txt).replace(/\n/g, '<br>') + '</div></td></tr></table>'
    : '';

  const linhasAss = String(modelo.assinatura || '').split('\n').map(function (x) { return preencherVars(x, vars).trim(); }).filter(String);
  const assinatura =
    (String(modelo.despedida || '').trim() ? textoParaHtml(modelo.despedida, vars, 'margin:24px 0 0;color:#111827;font-size:14px;') : '') +
    (linhasAss.length ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;border-left:3px solid #2563eb;"><tr><td style="padding:2px 0 2px 12px;">' +
      linhasAss.map(function (l, i) {
        const est = i === 0 ? 'font-size:14px;font-weight:700;color:#0f1a33;' : 'font-size:12.5px;color:#5b6475;';
        return '<div style="' + est + '">' + escHtml(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') + '</div>';
      }).join('') + '</td></tr></table>' : '');

  const cabecalho = (modelo.mostrarLogo || String(modelo.faixa).trim())
    ? '<tr><td style="background:#0f1a33;padding:22px 28px;">' +
      (modelo.mostrarLogo ? '<img src="' + URL_LOGO_EMAIL + '" alt="Grupo Quatro K" width="150" style="display:block;width:150px;max-width:150px;height:auto;border:0;">' : '') +
      (String(modelo.faixa).trim() ? '<div style="' + (modelo.mostrarLogo ? 'margin-top:10px;' : '') + 'color:#9fb3d9;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">' + escHtml(preencherVars(modelo.faixa, vars)) + '</div>' : '') +
      '</td></tr>'
    : '';

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#eef1f6;font-family:Segoe UI,Arial,Helvetica,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:24px 12px;"><tr><td align="center">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e7ee;">' +
    cabecalho +
    '<tr><td style="height:4px;background:' + cor + ';line-height:4px;font-size:0;">&nbsp;</td></tr>' +
    '<tr><td style="padding:28px;">' +
    textoParaHtml(modelo.saudacao, vars, 'margin:0 0 14px;color:#111827;font-size:15px;') +
    textoParaHtml(t.abertura, vars, 'margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;') +
    cartoes + blocoComentario +
    textoParaHtml(t.linhaAtendente, vars, 'margin:6px 0 0;color:#5b6475;font-size:12.5px;') +
    textoParaHtml(t.fechamento, vars, 'margin:18px 0 0;color:#374151;font-size:14px;line-height:1.6;') +
    (modelo.botao.mostrar && String(modelo.botao.texto).trim()
      ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 0;"><tr><td style="border-radius:8px;background:#2563eb;">' +
        '<a href="' + URL_APP + '" style="display:inline-block;padding:11px 20px;color:#ffffff;font-size:13.5px;font-weight:600;text-decoration:none;">' + escHtml(preencherVars(modelo.botao.texto, vars)) + '</a>' +
        '</td></tr></table>'
      : '') +
    assinatura +
    '</td></tr>' +
    (String(modelo.rodape).trim()
      ? '<tr><td style="background:#f8fafc;border-top:1px solid #e3e7ee;padding:14px 28px;">' + textoParaHtml(modelo.rodape, vars, 'margin:0;color:#8a93a3;font-size:11.5px;line-height:1.5;') + '</td></tr>'
      : '') +
    '</table></td></tr></table></body></html>';

  const blocosTexto = [textoParaTexto(modelo.saudacao, vars), textoParaTexto(t.abertura, vars)]
    .concat(pedidos.map(function (p) {
      return (selo ? '[' + selo + ']\n' : '') + detalhes(p).map(function (d) { return d[0] + ': ' + d[1]; }).join('\n');
    }))
    .concat(citacao ? [citacao.quem + ':\n' + citacao.txt] : [])
    .concat([textoParaTexto(t.linhaAtendente, vars), textoParaTexto(t.fechamento, vars),
      modelo.botao.mostrar && String(modelo.botao.texto).trim() ? preencherVars(modelo.botao.texto, vars) + ': ' + URL_APP : '',
      [textoParaTexto(modelo.despedida, vars)].concat(linhasAss.map(function (l) { return l.replace(/\*\*(.+?)\*\*/g, '$1'); })).filter(String).join('\n'),
      textoParaTexto(modelo.rodape, vars)]);
  const texto = blocosTexto.map(function (b) { return String(b || '').trim(); }).filter(String).join('\n\n');

  return { assunto: assunto, html: html, texto: texto };
}

// Rode esta função UMA VEZ pelo editor (Executar) para autorizar o envio de e-mails.
// Manda para a sua própria conta um exemplo de "incluído" e um de "recusado", com o modelo salvo.
function testarEmail() {
  const r = testeEmail({}, { usuario: 'teste', nome: 'Teste do Gerador', email: Session.getEffectiveUser().getEmail() });
  console.log(r.enviados + ' e-mails de teste enviados para ' + r.para + '. Cota restante hoje: ' + r.cota);
}

// ============================================================
//  CADASTRO DE DESTINATÁRIOS (versão 3.1)
// ============================================================
// Só quem está neste cadastro pode receber e-mail do Gerador.
function lerDestinatarios(ss) {
  const aba = obterAba(ss, ABA_DESTINATARIOS, CAB_DESTINATARIOS);
  const ultima = aba.getLastRow();
  if (ultima < 2) return { aba: aba, lista: [] };
  const lista = aba.getRange(2, 1, ultima - 1, CAB_DESTINATARIOS.length).getValues().map(function (r, i) {
    if (!r[0] && !r[2]) return null;
    const ativo = String(r[5]).trim().toUpperCase();
    return {
      linha: i + 2, id: String(r[0] || ('D' + (i + 2))), nome: String(r[1] || '').trim(), email: String(r[2] || '').trim().toLowerCase(),
      setor: String(r[3] || '').trim(), usuario: normalizarUsuario(r[4]), ativo: ativo !== 'NÃO' && ativo !== 'NAO',
      criadoEm: textoCelula(r[6], ss, 'dd/MM/yyyy HH:mm:ss'), atualizadoEm: textoCelula(r[7], ss, 'dd/MM/yyyy HH:mm:ss')
    };
  }).filter(function (x) { return x; });
  lista.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  return { aba: aba, lista: lista };
}

function gravarDestinatario(aba, d) {
  const linha = d.linha || (aba.getLastRow() + 1);
  aba.getRange(linha, 1, 1, CAB_DESTINATARIOS.length).setNumberFormat('@').setValues([[
    d.id, d.nome, d.email, d.setor || '', d.usuario || '', d.ativo ? 'SIM' : 'NÃO', d.criadoEm || '', d.atualizadoEm || ''
  ]]);
  d.linha = linha;
  return d;
}

function destinatarioPublico(d) {
  return { id: d.id, nome: d.nome, email: d.email, setor: d.setor, usuario: d.usuario, ativo: d.ativo, criadoEm: d.criadoEm, atualizadoEm: d.atualizadoEm };
}

function novoIdDestinatario() { return 'D' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(); }

function salvarDestinatario(ss, req) {
  const d = req.destinatario || {};
  const nome = textoLimpo(d.nome, 80);
  if (!nome) throw erroAcesso('destinatario', 'Informe o nome do destinatário.');
  const email = validarEmail(d.email);
  if (!email) throw erroAcesso('destinatario', 'Informe o e-mail do destinatário.');
  const dados = lerDestinatarios(ss);
  const id = String(d.id || '');
  const repetido = dados.lista.filter(function (x) { return x.email === email && x.id !== id; })[0];
  if (repetido) throw erroAcesso('destinatario', 'O e-mail ' + email + ' já está cadastrado para ' + repetido.nome + '.');
  const agora = agoraTexto(ss);
  let alvo = id ? dados.lista.filter(function (x) { return x.id === id; })[0] : null;
  if (id && !alvo) throw erroAcesso('destinatario', 'Destinatário não encontrado. Atualize a lista.');
  if (!alvo) alvo = { id: novoIdDestinatario(), criadoEm: agora };
  alvo.nome = nome; alvo.email = email; alvo.setor = textoLimpo(d.setor, 80);
  alvo.usuario = normalizarUsuario(d.usuario).slice(0, 40); alvo.ativo = d.ativo !== false; alvo.atualizadoEm = agora;
  gravarDestinatario(dados.aba, alvo);
  return { ok: true, destinatario: destinatarioPublico(alvo), destinatarios: lerDestinatarios(ss).lista.map(destinatarioPublico) };
}

function excluirDestinatario(ss, req) {
  const dados = lerDestinatarios(ss);
  const d = dados.lista.filter(function (x) { return x.id === String(req.id || ''); })[0];
  if (!d) throw erroAcesso('destinatario', 'Destinatário não encontrado.');
  dados.aba.deleteRow(d.linha);
  return { ok: true, excluido: d.nome + ' <' + d.email + '>', destinatarios: lerDestinatarios(ss).lista.map(destinatarioPublico) };
}

// Traz para o cadastro os usuários do Gerador que já têm e-mail (sem repetir e-mail nem usuário).
function importarDestinatarios(ss, usuarios) {
  const dados = lerDestinatarios(ss);
  const agora = agoraTexto(ss);
  let n = 0;
  usuarios.forEach(function (u) {
    const email = String(u.email || '').trim().toLowerCase();
    if (!email || u.pendente || u.ativo === false) return;
    if (dados.lista.some(function (x) { return x.email === email || (x.usuario && x.usuario === u.usuario); })) return;
    const d = gravarDestinatario(dados.aba, { id: novoIdDestinatario(), nome: u.nome || u.usuario, email: email, setor: '', usuario: u.usuario, ativo: true, criadoEm: agora, atualizadoEm: agora });
    dados.lista.push(d); n++;
  });
  return { ok: true, importados: n, destinatarios: lerDestinatarios(ss).lista.map(destinatarioPublico) };
}

// ============================================================
//  E-MAILS CONFERIDOS ANTES DO ENVIO (versão 3.1)
// ============================================================
// Cada aviso vira uma linha PENDENTE na aba Emails. O Gerador mostra a prévia e a lista
// de destinatários cadastrados; o e-mail só sai quando alguém clica Enviar.
const EM_PENDENTE = 'PENDENTE', EM_ENVIADO = 'ENVIADO', EM_DESCARTADO = 'DESCARTADO';

function lerFilaEmails(ss) {
  const aba = obterAba(ss, ABA_EMAILS, CAB_EMAILS);
  const ultima = aba.getLastRow();
  if (ultima < 2) return { aba: aba, lista: [] };
  const lista = aba.getRange(2, 1, ultima - 1, CAB_EMAILS.length).getValues().map(function (r, i) {
    if (!r[0]) return null;
    let dados = {};
    try { dados = JSON.parse(String(r[7] || '{}')) || {}; } catch (e) { dados = {}; }
    return {
      linha: i + 2, id: String(r[0]), criadoEm: textoCelula(r[1], ss, 'dd/MM/yyyy HH:mm:ss'), tipo: String(r[2] || ''), situacao: String(r[3] || EM_PENDENTE).toUpperCase(),
      geradoPor: String(r[4] || ''), nome: String(r[5] || ''), resumo: String(r[6] || ''), dados: dados,
      enviadoPor: String(r[8] || ''), enviadoEm: textoCelula(r[9], ss, 'dd/MM/yyyy HH:mm:ss'), destinatarios: String(r[10] || ''), assunto: String(r[11] || '')
    };
  }).filter(function (x) { return x; });
  return { aba: aba, lista: lista };
}

function gravarEmailFila(aba, e) {
  const linha = e.linha || (aba.getLastRow() + 1);
  aba.getRange(linha, 1, 1, CAB_EMAILS.length).setNumberFormat('@').setValues([[
    e.id, e.criadoEm, e.tipo, e.situacao, e.geradoPor || '', e.nome || '', e.resumo || '', JSON.stringify(e.dados || {}).slice(0, 49000),
    e.enviadoPor || '', e.enviadoEm || '', e.destinatarios || '', e.assunto || ''
  ]]);
  e.linha = linha;
  return e;
}

const NOMES_TIPO_EMAIL = { incluido: 'Pedido incluído', recusado: 'Pedido recusado', reaberto: 'Pedido reaberto', comentario: 'Comentário no pedido', lembrete: 'Lembrete de pedido parado' };

function resumoPedidosEmail(pedidos) {
  const p0 = pedidos[0] || {};
  return (p0.de || '') + ' → ' + (p0.para || '') + (pedidos.length > 1 ? ' e mais ' + (pedidos.length - 1) : '');
}

// Cria o e-mail pendente. "sugeridos" são pessoas (usuários) que normalmente receberiam o aviso;
// na conferência elas aparecem já marcadas se estiverem no cadastro de destinatários.
// Devolve o ID do pendente, ou '' se os avisos por e-mail estiverem desligados.
function enfileirarEmail(ss, tipo, pedidos, quem, extra, sugeridos) {
  if (!pedidos || !pedidos.length) return '';
  const modelo = lerModeloEmail().modelo;
  if (!modelo.ativo) return '';
  const fila = lerFilaEmails(ss);
  const agora = agoraTexto(ss);
  const snap = pedidos.map(function (p) { return { id: p.id, criadoEm: p.criadoEm, usuario: p.usuario, nome: p.nome, de: p.de, para: p.para, qtd: p.qtd, conteudo: p.conteudo, obs: p.obs, minuta: p.minuta || '', atendidoPor: p.atendidoPor || '', atendidoEm: p.atendidoEm || '', motivo: p.motivo || '' }; });
  const sug = [];
  (sugeridos || []).forEach(function (u) {
    if (!u) return;
    const k = u.usuario || u.email;
    if (sug.some(function (x) { return (x.usuario || x.email) === k; })) return;
    sug.push({ usuario: u.usuario || '', nome: u.nome || u.usuario || '', email: String(u.email || '').toLowerCase() });
  });
  const dados = { pedidos: snap, extra: extra || {}, atendente: quem ? { usuario: quem.usuario || '', nome: quem.nome || quem.usuario || '', email: quem.email || '' } : null, sugeridos: sug };
  // O lembrete não se acumula: atualiza o que ainda estiver pendente.
  let e = tipo === 'lembrete' ? fila.lista.filter(function (x) { return x.tipo === 'lembrete' && x.situacao === EM_PENDENTE; })[0] : null;
  if (!e) e = { id: 'E' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(), situacao: EM_PENDENTE, tipo: tipo };
  e.criadoEm = agora;
  e.geradoPor = quem ? (quem.usuario || 'codigo') : 'sistema';
  e.nome = quem ? (quem.nome || quem.usuario || '') : 'Sistema';
  e.resumo = (NOMES_TIPO_EMAIL[tipo] || tipo) + ': ' + resumoPedidosEmail(snap);
  e.dados = dados;
  gravarEmailFila(fila.aba, e);
  return e.id;
}

function podeVerEmail(quem, e) { return e.geradoPor === (quem.usuario || 'codigo') || quem.permissoes.indexOf('emails.enviar') >= 0; }

// Sugeridos que estão no cadastro (ligados pelo usuário do Gerador ou pelo e-mail) e os que faltam cadastrar.
function casarSugeridos(sugeridos, destinatarios) {
  const ids = [], faltam = [];
  (sugeridos || []).forEach(function (s) {
    const d = destinatarios.filter(function (x) { return x.ativo && ((s.usuario && x.usuario === s.usuario) || (s.email && x.email === s.email)); })[0];
    if (d) { if (ids.indexOf(d.id) < 0) ids.push(d.id); }
    else faltam.push({ usuario: s.usuario, nome: s.nome, email: s.email });
  });
  return { ids: ids, faltam: faltam };
}

function emailPublico(e, destinatarios, usuarios) {
  const sug = (e.dados.sugeridos || []).map(function (s) {
    // E-mail atual do usuário (pode ter sido cadastrado depois do aviso).
    const u = s.usuario ? usuarios.filter(function (x) { return x.usuario === s.usuario; })[0] : null;
    return { usuario: s.usuario, nome: (u && u.nome) || s.nome, email: (u && u.email) || s.email };
  });
  const casados = casarSugeridos(sug, destinatarios);
  const ex = e.dados.extra || {};
  return {
    id: e.id, criadoEm: e.criadoEm, tipo: e.tipo, nomeTipo: NOMES_TIPO_EMAIL[e.tipo] || e.tipo, situacao: e.situacao, geradoPor: e.geradoPor, nome: e.nome, resumo: e.resumo,
    pedidos: (e.dados.pedidos || []).map(function (p) { return { de: p.de, para: p.para, qtd: p.qtd, conteudo: p.conteudo, nome: p.nome, minuta: p.minuta, motivo: p.motivo, obs: p.obs }; }),
    extra: { comentario: ex.comentario || '', autor: ex.autor || '', nota: ex.nota || '', horas: ex.horas || '' },
    sugeridos: casados.ids, semCadastro: casados.faltam,
    enviadoPor: e.enviadoPor, enviadoEm: e.enviadoEm, destinatarios: e.destinatarios, assunto: e.assunto
  };
}

function listarEmails(ss, usuarios, quem) {
  const dest = lerDestinatarios(ss).lista;
  const visiveis = lerFilaEmails(ss).lista.filter(function (e) { return podeVerEmail(quem, e); });
  const pendentes = visiveis.filter(function (e) { return e.situacao === EM_PENDENTE; });
  const recentes = visiveis.filter(function (e) { return e.situacao !== EM_PENDENTE; }).reverse().slice(0, 30);
  return {
    ok: true,
    pendentes: pendentes.map(function (e) { return emailPublico(e, dest, usuarios); }),
    recentes: recentes.map(function (e) { return emailPublico(e, dest, usuarios); }),
    destinatarios: dest.filter(function (d) { return d.ativo; }).map(destinatarioPublico),
    podeEditar: quem.permissoes.indexOf('cadastros.editar') >= 0,
    podeTodos: quem.permissoes.indexOf('emails.enviar') >= 0,
    avisosLigados: !!lerModeloEmail().modelo.ativo
  };
}

function pegarEmailFila(ss, quem, id) {
  const fila = lerFilaEmails(ss);
  const e = fila.lista.filter(function (x) { return x.id === String(id || ''); })[0];
  if (!e) throw erroAcesso('email', 'E-mail não encontrado. Atualize a lista.');
  if (!podeVerEmail(quem, e)) throw erroAcesso('permissao', 'Só quem gerou este e-mail ou quem tem "Conferir e enviar e-mails" pode mexer nele.');
  return { fila: fila, e: e };
}

// Monta a mensagem de um pendente para um destinatário (prévia e envio usam a mesma função).
function mensagemFila(e, destino, modelo) {
  const pedidos = e.dados.pedidos || [];
  if (!pedidos.length) throw erroAcesso('email', 'Este e-mail não tem pedidos.');
  const at = e.dados.atendente;
  return montarEmailPedido(e.tipo, destino, pedidos, at && at.nome ? at : null, modelo, e.dados.extra || {});
}

function previaEmailFila(ss, usuarios, quem, req) {
  const e = pegarEmailFila(ss, quem, req.id).e;
  const dest = lerDestinatarios(ss).lista;
  let destino = dest.filter(function (x) { return x.id === String(req.destinatario || ''); })[0];
  if (!destino) {
    const s = (e.dados.sugeridos || [])[0];
    destino = s ? { nome: s.nome, usuario: s.usuario, email: s.email || '' } : { nome: 'Destinatário', usuario: '', email: '' };
  }
  const msg = mensagemFila(e, destino, lerModeloEmail().modelo);
  return { ok: true, assunto: msg.assunto, html: msg.html, para: destino.nome };
}

function enviarEmailFila(ss, quem, req) {
  const r = pegarEmailFila(ss, quem, req.id), e = r.e;
  if (e.situacao !== EM_PENDENTE) throw erroAcesso('email', 'Este e-mail já foi ' + (e.situacao === EM_ENVIADO ? 'enviado' : 'descartado') + (e.enviadoPor ? ' por ' + e.enviadoPor : '') + '.');
  const ids = (Array.isArray(req.destinatarios) ? req.destinatarios : []).map(String);
  const dest = lerDestinatarios(ss).lista.filter(function (d) { return d.ativo && d.email && ids.indexOf(d.id) >= 0; });
  if (!dest.length) throw erroAcesso('email', 'Marque pelo menos um destinatário do cadastro.');
  const modelo = lerModeloEmail().modelo;
  const cota = MailApp.getRemainingDailyQuota();
  if (cota < dest.length) throw erroAcesso('email', 'A cota diária de e-mails do Google acabou (restam ' + cota + '). Tente amanhã ou marque menos destinatários.');
  const at = e.dados.atendente;
  const responder = modelo.responderPara || (at && at.email) || '';
  const enviados = [];
  let assunto = '';
  dest.forEach(function (d) {
    const msg = mensagemFila(e, d, modelo);
    const opcoes = { name: modelo.remetente || EMAIL_NOME_REMETENTE, htmlBody: msg.html };
    if (responder) opcoes.replyTo = responder;
    MailApp.sendEmail(d.email, msg.assunto, msg.texto, opcoes);
    enviados.push(d.nome + ' <' + d.email + '>');
    assunto = assunto || msg.assunto;
  });
  e.situacao = EM_ENVIADO; e.enviadoPor = quem.nome || quem.usuario || ''; e.enviadoEm = agoraTexto(ss);
  e.destinatarios = enviados.join(', '); e.assunto = assunto;
  gravarEmailFila(r.fila.aba, e);
  return { ok: true, enviados: enviados.length, para: enviados, assunto: assunto, cota: MailApp.getRemainingDailyQuota() };
}

function descartarEmailFila(ss, quem, req) {
  const r = pegarEmailFila(ss, quem, req.id), e = r.e;
  if (e.situacao !== EM_PENDENTE) throw erroAcesso('email', 'Este e-mail não está mais pendente.');
  e.situacao = EM_DESCARTADO; e.enviadoPor = quem.nome || quem.usuario || ''; e.enviadoEm = agoraTexto(ss);
  gravarEmailFila(r.fila.aba, e);
  return { ok: true, resumo: e.resumo };
}
