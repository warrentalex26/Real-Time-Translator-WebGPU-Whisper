import { generateSummary, getAIProvider } from './ai-chat.js';
// We'll use marked to parse Markdown if available, otherwise fallback to simple regex
// Let's implement a simple markdown parser for bold, headers, and lists
function parseMarkdown(text) {
  let html = text;
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Lists (simple implementation)
  html = html.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>');
  
  // Fix multiple ul/ol lists by merging them
  html = html.replace(/<\/ul>\n<ul>/g, '\n');
  html = html.replace(/<\/ol>\n<ol>/g, '\n');

  // Paragraphs (anything that isn't a tag and has double line breaks)
  html = html.split(/\n\n+/).map(p => {
    if (!p.trim().startsWith('<') && p.trim().length > 0) {
      return `<p>${p.trim().replace(/\n/g, '<br>')}</p>`;
    }
    return p;
  }).join('\n');

  return html;
}

document.addEventListener('DOMContentLoaded', () => {
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const summaryContent = document.getElementById('summary-content');
  const errorMessage = document.getElementById('error-message');
  
  const btnRegenerate = document.getElementById('btn-regenerate');
  const btnExportTxt = document.getElementById('btn-export-txt');
  const btnExportDoc = document.getElementById('btn-export-doc');
  const btnClose = document.getElementById('btn-close');
  const btnRetry = document.getElementById('btn-retry');

  let rawSummaryText = "";

  const transcript = localStorage.getItem('temp_transcript_summary');

  if (!transcript) {
    showError("The meeting transcript could not be found. Please return to the homepage and generate the summary again.");
    return;
  }

  // Comienza a generar el resumen inmediatamente
  generate();

  // Listeners
  btnRegenerate.addEventListener('click', generate);
  btnRetry.addEventListener('click', generate);
  btnClose.addEventListener('click', () => window.close());
  btnExportTxt.addEventListener('click', exportToTxt);
  btnExportDoc.addEventListener('click', exportToDoc);

  async function generate() {
    showLoading();
    try {
      rawSummaryText = await generateSummary(transcript);
      showSummary(rawSummaryText);
    } catch (err) {
      showError(err.message);
    }
  }

  function showLoading() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    summaryContent.classList.add('hidden');
    
    btnRegenerate.disabled = true;
    btnExportTxt.disabled = true;
    btnExportDoc.disabled = true;
  }

  function showError(msg) {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    summaryContent.classList.add('hidden');
    
    errorMessage.textContent = msg;
    
    btnRegenerate.disabled = false;
    btnExportTxt.disabled = true;
    btnExportDoc.disabled = true;
  }

  function showSummary(text) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    summaryContent.classList.remove('hidden');
    
    summaryContent.innerHTML = parseMarkdown(text);
    
    btnRegenerate.disabled = false;
    btnExportTxt.disabled = false;
    btnExportDoc.disabled = false;
  }

  function exportToTxt() {
    if (!rawSummaryText) return;
    const blob = new Blob([rawSummaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Resumen_Reunion_${formatDate()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportToDoc() {
    if (!rawSummaryText) return;
    
    // Create a basic HTML structure that Word can read
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'><title>Resumen de Reunión</title></head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + summaryContent.innerHTML + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Resumen_Reunion_${formatDate()}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function formatDate() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  }
});
