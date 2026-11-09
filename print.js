// Gera o HTML da minuta no formato A4 (uma página), baseado no modelo MINUTA.rtf
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmtData(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }

function buildPrintHTML(m) {
  const r = m.remetente, d = m.destinatario;
  const volumes = esc(m.volumes || '');
  const tipos = esc(m.embalagem || '');
  const declaracao = esc(m.declaracao || 'Declaro que as informações acima estão corretas, e que concordo com as disposições legais e regulamentares contidas no conhecimento.');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:Cambria,"Times New Roman",serif;color:#000}
.page{width:210mm;height:297mm;padding:8mm 8.5mm;overflow:hidden}
.stamp{text-align:right;font-size:9pt;margin-bottom:3mm}
table{border-collapse:collapse;width:100%}
td{border:1px solid #000;vertical-align:top;padding:1.05mm 1.4mm;font-size:8pt}
.h td{background:#dce6f2}
.lbl{font-weight:bold;font-size:7.5pt}
.val{font-size:8pt;margin-top:.5mm}
.b{font-weight:bold}
.title{font-size:15pt;font-weight:bold;text-align:center;vertical-align:middle}
.sec{text-align:center;font-weight:bold;font-size:7.5pt;border-bottom:0}
.big{font-size:13pt;font-weight:bold}
.it{width:100%;border-collapse:collapse;margin-top:1mm}
.it th,.it td{border:1px solid #555;font-size:8pt;padding:.6mm 1mm;text-align:left}
.it th{background:#eef2f8}.c{text-align:center}
.nf{border:0}
</style></head><body><div class="page">
<div class="stamp">${esc(m.carimbo)}</div>
<table>
<tr class="h">
 <td style="width:22%;vertical-align:middle;text-align:center;background:#081127" rowspan="2"><img src="${window.LOGO || ''}" style="width:39mm;height:auto;max-width:100%"></td>
 <td class="title" style="width:45%">MINUTA DE<br>DESPACHO</td>
 <td style="width:33%;vertical-align:middle;font-size:12pt" rowspan="2">N°: <b style="font-size:15pt">${esc(m.numero)}</b></td>
</tr>
<tr class="h"><td style="height:5mm;font-size:7.5pt">Documento de despacho</td></tr>
</table>
<table style="border-top:0">
<tr><td class="sec" colspan="3" style="width:56%">REMETENTE</td><td class="sec" colspan="3">DESTINATÁRIO</td></tr>
<tr><td colspan="3"><div class="lbl">Nome/Razão Social</div><div class="val b">${esc(r.nome)}</div></td><td colspan="3"><div class="lbl">Nome/Razão Social</div><div class="val">${esc(d.nome)}</div></td></tr>
<tr><td colspan="2"><div class="lbl">CNPJ/CPF</div><div class="val">${esc(r.cnpj)}</div></td><td><div class="lbl">IE</div><div class="val b">${esc(r.ie)}</div></td>
    <td colspan="2"><div class="lbl">CNPJ/CPF</div><div class="val">${esc(d.cnpj)}</div></td><td><div class="lbl">IE</div><div class="val b">${esc(d.ie)}</div></td></tr>
<tr><td colspan="3"><div class="lbl">Endereço/Logradouro</div><div class="val">${esc(r.endereco)}${r.numero ? ', ' + esc(r.numero) : ''}${r.cep ? ' – CEP: ' + esc(r.cep) : ''}</div></td>
    <td colspan="2"><div class="lbl">Endereço/Logradouro</div><div class="val">${esc(d.endereco)}${d.cep ? '<br>CEP: ' + esc(d.cep) : ''}</div></td><td><div class="lbl">Nº</div><div class="val b">${esc(d.numero)}</div></td></tr>
<tr><td colspan="3"><div class="lbl">Telefone</div><div class="val">${esc(r.telefone)}</div></td>
    <td><div class="lbl">Complemento</div><div class="val">${esc(d.complemento)}</div></td><td><div class="lbl">Telefone</div><div class="val">${esc(d.telefone)}</div></td><td><div class="lbl">Fax</div><div class="val">${esc(d.fax)}</div></td></tr>
<tr><td colspan="2" style="height:10mm"><div class="lbl">Nome do Contato:</div><div class="val b">${esc(r.contato)}</div></td><td><div class="lbl">Centro de Custo</div><div class="val b">${esc(r.centroCusto)}</div></td>
    <td colspan="2"><div class="lbl">Nome do Contato</div><div class="val b">${esc(d.contato)}</div></td><td><div class="lbl">Centro de Custo</div><div class="val b">${esc(d.centroCusto)}</div></td></tr>
</table>
<table style="border-top:0">
<tr>
 <td style="width:50%;text-align:center"><div class="lbl">Quant. Vol.</div><div class="big" style="text-decoration:underline">${volumes}</div></td>
 <td style="width:50%;text-align:center"><div class="lbl">Tipo Embalagem</div><div class="val">${tipos}</div></td>
</tr>
<tr><td colspan="2" style="height:44mm">
 <div class="b" style="font-size:8pt;line-height:1.35;margin:2mm 0 3mm">${declaracao}</div>
 <div class="b" style="font-size:7.5pt;text-align:center;margin:3mm 0">AUTORIZO O EMBARQUE DOS VOLUMES RELACIONADOS, CONFORME ESPECIFICAÇÃO DESTA MINUTA.</div>
 <table class="nf"><tr><td class="nf" style="width:50%"><div class="big">Data<br>${esc(m.dataEntrega || m.data)}${m.horaEntrega ? ' ' + esc(m.horaEntrega) : ''}</div></td>
 <td class="nf"><div class="lbl">Assinatura</div><div style="margin-top:9mm;border-top:1px solid #000;padding-top:1mm;font-size:8pt">${esc(m.assinatura)}</div></td></tr></table>
</td></tr>
</table>
<table style="border-top:0">
<tr><td style="width:16%;height:30mm"></td>
<td style="width:41%;font-size:11pt;line-height:1.7"><b>Recebimento</b><br><b>Recebido em: ___/___/____</b><br><b>Nome: ______________________</b><br><b>Ass.: _______________________</b></td>
<td style="padding:0"><table style="height:100%"><tr><td style="border:0;font-size:11pt"><b>Hora</b></td></tr></table></td></tr>
</table>
</div></body></html>`;
}
