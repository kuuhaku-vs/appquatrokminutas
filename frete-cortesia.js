(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const defaults = {
    freteTitulo: 'FRETE CORTESIA – QUATRO K TÊXTIL LTDA',
    freteTipo: 'MALOTE INTERNO',
    freteDe: 'QUATRO K TÊXTIL LTDA – ILHOTA / SC',
    freteEndDe: 'RUA JOSÉ GERALDINO BITTENCOURT, 470 – SALA G – PEDRA DE AMOLAR – ILHOTA / SC',
    freteCepDe: '88320-000',
    fretePara: 'QUATRO K TÊXTIL LTDA – SÃO CAETANO DO SUL / SP',
    freteAC: '',
    freteEndPara: 'RUA PARAIBA, 270/276 – CENTRO – SÃO CAETANO DO SUL / SP',
    freteCepPara: '09531-070'
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const FRETE_STORAGE_KEY = 'nova-frete-dados-v1';
  const idsFrete = ['freteTitulo','freteTipo','freteDe','freteEndDe','freteCepDe','fretePara','freteAC','freteEndPara','freteCepPara'];
  function lerCfgAtual() {
    try { if (typeof cfg !== 'undefined' && cfg && typeof cfg === 'object') return cfg; } catch {}
    try { return JSON.parse(localStorage.getItem('cfg') || 'null') || {}; } catch { return {}; }
  }
  function enderecoCompleto(p) {
    return [p?.endereco, p?.numero, p?.complemento].map(v => String(v || '').trim()).filter(Boolean).join(' – ');
  }
  function fonteGeral(c) {
    return {
      freteDe: c.remetente?.nome || defaults.freteDe,
      freteEndDe: enderecoCompleto(c.remetente) || defaults.freteEndDe,
      freteCepDe: c.remetente?.cep || defaults.freteCepDe,
      fretePara: c.destinatario?.nome || defaults.fretePara,
      freteEndPara: enderecoCompleto(c.destinatario) || defaults.freteEndPara,
      freteCepPara: c.destinatario?.cep || defaults.freteCepPara
    };
  }
  function carregarDadosVinculados() {
    const c = lerCfgAtual();
    const vinculados = fonteGeral(c);
    let salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(FRETE_STORAGE_KEY) || 'null'); } catch {}
    // As edições de Frete Cortesia são armazenadas separadamente. Se os cadastros
    // gerais mudarem, os seis campos vinculados passam a refletir os dados novos.
    const origemAtual = JSON.stringify(vinculados);
    const usarEdicoes = salvo && salvo.origemGeral === origemAtual;
    const valores = usarEdicoes ? { ...vinculados, ...salvo.campos } : vinculados;
    Object.entries(defaults).forEach(([id, fallback]) => {
      if (!$(id)) return;
      if (Object.prototype.hasOwnProperty.call(valores, id)) $(id).value = valores[id] ?? fallback;
    });
    if (salvo?.campos) ['freteTitulo','freteTipo','freteAC'].forEach(id => {
      if ($(id) && Object.prototype.hasOwnProperty.call(salvo.campos, id)) $(id).value = salvo.campos[id] ?? '';
    });
  }
  async function persistirDadosFrete() {
    const c = lerCfgAtual();
    const origemGeral = JSON.stringify(fonteGeral(c));
    const campos = {};
    idsFrete.forEach(id => { if ($(id)) campos[id] = $(id).value.trim(); });
    // Importante: não alterar cfg.remetente/destinatario aqui. Essa configuração
    // é compartilhada com a minuta e tem campos separados para endereço, número,
    // complemento, CNPJ, telefone etc. Sobrescrevê-la quebrava a impressão da minuta.
    try {
      localStorage.setItem(FRETE_STORAGE_KEY, JSON.stringify({ origemGeral, campos }));
      if (typeof window.toast === 'function') window.toast('Dados de Frete Cortesia salvos. Os dados gerais da minuta foram preservados.');
    } catch (e) {
      console.error('Falha ao salvar dados de Frete Cortesia:', e);
      if (typeof window.toast === 'function') window.toast('Não foi possível salvar os dados. Tente novamente.', true);
    }
  }

  function restaurar() {
    try { localStorage.removeItem(FRETE_STORAGE_KEY); } catch {}
    carregarDadosVinculados();
  }

  function documentoHTML() {
    const valor = (id, fallback = '') => $(id) ? $(id).value.trim() : fallback;
    const titulo = esc(valor('freteTitulo', defaults.freteTitulo) || defaults.freteTitulo);
    const tipo = esc(valor('freteTipo', defaults.freteTipo) || defaults.freteTipo);
    const de = esc(valor('freteDe', defaults.freteDe));
    const endDe = esc(valor('freteEndDe', defaults.freteEndDe)).replace(/\r?\n/g, '<br>');
    const cepDe = esc(valor('freteCepDe', defaults.freteCepDe));
    const para = esc(valor('fretePara', defaults.fretePara));
    const acRaw = valor('freteAC', defaults.freteAC);
    const ac = esc(acRaw);
    const endPara = esc(valor('freteEndPara', defaults.freteEndPara)).replace(/\r?\n/g, '<br>');
    const cepPara = esc(valor('freteCepPara', defaults.freteCepPara));

    const defaultsPrint = {fonte:'Times New Roman', tamanho:8.5, titulo:9.5, alinhamento:'center', espaco:1.5, peso:'bold'};
    const formato = $('freteFormato')?.value === 'grande' ? 'grande' : 'compacto';
    const grande = formato === 'grande';
    let settings = defaultsPrint;
    try {
      const appConfig = typeof cfg !== 'undefined' && cfg ? cfg : {};
      settings = {...defaultsPrint, ...(appConfig.impressao || {})};
    } catch {}
    const fonte = ['Times New Roman','Cambria','Arial','Calibri','Georgia','Verdana'].includes(settings.fonte) ? settings.fonte : defaultsPrint.fonte;
    const tamanho = Math.min(16, Math.max(7, Number(settings.tamanho) || defaultsPrint.tamanho));
    const tamanhoTitulo = Math.min(20, Math.max(9, Number(settings.titulo) || defaultsPrint.titulo));
    const espaco = Math.min(6, Math.max(1, Number(settings.espaco) || defaultsPrint.espaco));
    const alinhamento = ['left','center','right'].includes(settings.alinhamento) ? settings.alinhamento : 'center';
    const peso = settings.peso === 'normal' ? 'normal' : 'bold';

    const conteudo = `
      <article class="label ${grande ? 'label-large' : 'label-compact'}">
        <h1>${titulo}</h1>
        <p class="date-line">DATA: ____ / ____ / ______</p>
        <h2>${tipo}</h2>
        <section class="party origin">
          <p class="party-name">DE: ${de}</p>
          <p class="address">ENDEREÇO: ${endDe}</p>
          <p class="cep">CEP: ${cepDe}</p>
        </section>
        <section class="party destination">
          <p class="party-name">PARA: ${para}</p>
          <p class="address">ENDEREÇO: ${endPara}</p>
          <p class="cep">CEP: ${cepPara}</p>
        </section>
        ${ac ? `<div class="attention-box"><span class="attention-label">A/C · AOS CUIDADOS DE</span><span class="attention-name">${ac}</span></div>` : ''}
      </article>`;

    const pageCSS = grande
      ? `.sheet { width: 210mm; height: 297mm; padding: 0; display: block; overflow: hidden; }
.label { position: relative; width: 210mm; height: 297mm; min-width: 210mm; min-height: 297mm; padding: 22mm 18mm; border: 0; overflow: hidden; break-inside: avoid; }
h1 { margin: 0 0 7mm; text-align: ${alinhamento}; font-size: ${Math.max(18, Math.min(26, tamanhoTitulo * 1.9))}pt; line-height: 1.15; font-weight: ${peso}; overflow-wrap: anywhere; }
.date-line { margin: 0 0 7mm; font-size: ${Math.max(13, tamanho * 1.7)}pt; line-height: 1.2; text-align: left; white-space: nowrap; }
h2 { margin: 0 0 8mm; text-align: center; text-decoration: underline; font-size: ${Math.max(15, tamanho * 1.8)}pt; line-height: 1.2; font-weight: ${peso}; }
.party { margin: 0; line-height: 1.4; overflow-wrap: anywhere; font-size: ${Math.max(13, tamanho * 1.65)}pt; }
.origin { margin-bottom: 12mm; }
.party p { margin: 0 0 2mm; }
.party-name { font-weight: bold; }
.attention-box { position: absolute; right: 18mm; bottom: 20mm; width: auto; max-width: 95mm; min-width: 70mm; padding: 4mm 5mm; border: 1mm solid #000; background: #fff; display: flex; flex-direction: column; gap: 2mm; text-align: center; font-weight: bold; line-height: 1.1; overflow-wrap: anywhere; }
.attention-label { font-size: 12pt; font-weight: bold; letter-spacing: 0.3pt; }
.attention-name { font-size: 18pt; font-weight: bold; text-transform: uppercase; }
.address { line-height: 1.4; }
.party .cep { margin-bottom: 0; }`
      : `.sheet { width: 210mm; height: 297mm; padding: 8.5mm 0; display: grid; grid-template-columns: 100mm 100mm; grid-template-rows: 70mm 70mm 70mm 70mm; column-gap: 0mm; row-gap: 0mm; justify-content: center; align-content: start; overflow: hidden; }
.label { position: relative; width: 100mm; height: 70mm; min-width: 100mm; min-height: 70mm; padding: 6mm 3mm 3mm; border: 0.25mm dashed #777; overflow: hidden; break-inside: avoid; }
h1 { margin: 0 0 ${Math.min(2, espaco)}mm; text-align: ${alinhamento}; font-size: ${Math.min(11, tamanhoTitulo)}pt; line-height: 1.08; font-weight: ${peso}; overflow-wrap: anywhere; }
.date-line { margin: 0 0 ${Math.min(1.5, espaco)}mm; font-size: ${Math.min(9, tamanho)}pt; line-height: 1.1; text-align: left; white-space: nowrap; }
h2 { margin: 0 0 ${Math.min(2, espaco)}mm; text-align: center; text-decoration: underline; font-size: ${Math.min(9.5, tamanho)}pt; line-height: 1.1; font-weight: ${peso}; }
.party { margin: 0; line-height: 1.15; overflow-wrap: anywhere; font-size: ${Math.min(9, tamanho)}pt; }
.origin { margin-bottom: ${Math.min(3, Math.max(2, espaco))}mm; }
.party p { margin: 0 0 0.8mm; }
.party-name { font-weight: bold; }
.attention-box { position: absolute; right: 3mm; bottom: 3mm; width: auto; max-width: 66mm; min-width: 44mm; padding: 1.5mm 2mm; border: 0.6mm solid #000; background: #fff; display: flex; flex-direction: column; gap: 0.6mm; text-align: center; font-weight: bold; line-height: 1.05; overflow-wrap: anywhere; }
.attention-label { font-size: 7.5pt; font-weight: bold; letter-spacing: 0.2pt; }
.attention-name { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
.address { line-height: 1.15; }
.party .cep { margin-bottom: 0; }`;

    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Frete Cortesia – ${grande ? 'A4 grande' : '8 vias de 100 × 70 mm'}</title>
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; color: #000; background: #fff; }
body { font-family: "${fonte}", serif; font-size: ${grande ? Math.max(13, tamanho * 1.65) : tamanho}pt; font-weight: normal; }
${pageCSS}
@media screen {
  html { background: #e7e7e7; }
  body { width: 210mm; margin: 12px auto; box-shadow: 0 2px 14px #0002; }
  .sheet { background: white; }
}
@media print {
  html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
  .sheet { page-break-after: avoid; break-after: avoid; }
  .label { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
</style></head><body><main class="sheet">${grande ? conteudo : `${conteudo}${conteudo}${conteudo}${conteudo}${conteudo}${conteudo}${conteudo}${conteudo}`}</main>
<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),300)});<\/script></body></html>`;
  }

  async function imprimir() {
    await persistirDadosFrete();
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) {
      if (typeof window.toast === 'function') window.toast('O navegador bloqueou a janela de impressão. Permita pop-ups para o NØVA.', true);
      else alert('O navegador bloqueou a janela de impressão. Permita pop-ups para o NØVA.');
      return;
    }
    w.document.open();
    w.document.write(documentoHTML());
    w.document.close();
    w.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('btnFreteCortesia')?.addEventListener('click', () => {
      if (typeof window.go === 'function') window.go('frete');
      else document.getElementById('v-frete')?.classList.add('active');
      setTimeout(carregarDadosVinculados, 80);
    });
    carregarDadosVinculados();
    // Ao voltar para esta tela, recarrega os dados atuais da primeira tela.
    document.querySelectorAll('[data-go], .screen-home').forEach(el => el.addEventListener('click', () => { try { setTimeout(carregarDadosVinculados, 0); } catch {} }));
    // Salva ao sair de um campo, para persistir como os demais cadastros sem gravar a cada tecla.
    idsFrete.forEach(id => { const el = $(id); if (el) el.addEventListener('change', persistirDadosFrete); });
    const formato = $('freteFormato');
    const hint = $('freteFormatoHint');
    try { if (formato) formato.value = localStorage.getItem('nova-frete-formato') === 'grande' ? 'grande' : 'compacto'; } catch {}
    const atualizarFormato = () => {
      const grande = formato?.value === 'grande';
      if (hint) hint.textContent = grande ? 'Modelo grande: uma via ampliada ocupa a folha A4 inteira.' : 'Modelo compacto: oito vias de 100 × 70 mm, em duas colunas e quatro linhas, com linhas de corte.';
      try { localStorage.setItem('nova-frete-formato', grande ? 'grande' : 'compacto'); } catch {}
    };
    formato?.addEventListener('change', atualizarFormato);
    atualizarFormato();
    $('btnFreteImprimir')?.addEventListener('click', imprimir);
    window.addEventListener('focus', () => { if (document.getElementById('v-frete')?.classList.contains('active')) carregarDadosVinculados(); });
    $('btnFreteLimpar')?.addEventListener('click', restaurar);
  });
})();
