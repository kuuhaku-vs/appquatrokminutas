// Configuração do Gerador de Minutas (versão web / celular).
// scriptUrl: "URL do app da Web" do Apps Script ligado à planilha "Gerador de Minutas - 4K".
//   O CÓDIGO DE ACESSO NÃO fica aqui (este repositório é público): cada aparelho digita uma vez
//   em Configurações › Google Sheets, e ele fica guardado só naquele aparelho.
//   Deixe scriptUrl vazio ('') para pedir também o endereço em cada aparelho.
window.MINUTAS_CONFIG = {
  // v3.9: script publicado pela conta amostra@quatrok.com.br (os e-mails saem dela).
  scriptUrl: 'https://script.google.com/macros/s/AKfycbyj3YLe8PMkXzu-Sl9QDnyfU9rSaLLordh0OLubNU6LTpVzNwpC0FByOf22cmac3IJxQw/exec',
  // URLs antigas: aparelhos que tinham uma delas salva passam sozinhos para a scriptUrl acima.
  urlsAntigas: ['https://script.google.com/macros/s/AKfycbwEgHeLXu0dcGJx3vE4QYzgYRGQja6QMNJ8aIu3fupdZlGBL6F17P0cEswOgyR6gjaT/exec'],
  digitos: 6
};
