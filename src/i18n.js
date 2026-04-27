export const translations = {
  en: {
    "title": "Real-Time Translator",
    "verifying_webgpu": "Verifying WebGPU...",
    "webgpu_ready": "WebGPU Ready",
    "webgpu_error": "WebGPU not available. Using WASM (slower)",
    "audio_source": "Audio Source",
    "microphone": "Microphone",
    "tab_audio": "Tab Audio",
    "whisper_model": "Whisper Model",
    "fast": "Fast",
    "balanced": "Balanced",
    "accurate": "Accurate",
    "start_translation": "Start Translation",
    "stop_translation": "Stop Translation",
    "loading_model": "Loading Whisper model...",
    "loading_note": "First time: ~200MB. Will be cached.",
    "subtitles_title": "📝 Real-Time Subtitles",
    "listening": "Listening...",
    "empty_subtitles": "Subtitles will appear here",
    "empty_hint": "Select an audio source and click \"Start Translation\"",
    "chat_title": "🤖 Ask about the meeting",
    "chat_empty": "💡 Ask something about the conversation",
    "chat_hint": "Ex: \"What did they say about the new feature?\"",
    "chat_placeholder": "Type your question...",
    "save": "Save",
    "footer_info": "🚀 Local processing with WebGPU • 🔒 Your audio never leaves the browser",
    "translating": "Translating...",
    "no_transcript_error": "No transcript available yet. Start a recording first.",
    "empty_question_error": "Please type a question.",
    "ollama_connection_error": "Error connecting to Ollama: {error}\n\nMake sure Ollama is running:\n1. Install Ollama: https://ollama.ai\n2. Run: ollama run llama3.2\n3. Try again",
    "download_tooltip": "Download transcript",
    "summary_tooltip": "Generate AI Summary",
    "close_summary_tooltip": "Close Summary",
    "summary_title": "Detailed Meeting Summary",
    "regenerate_tooltip": "Regenerate Summary",
    "export_txt_tooltip": "Export to TXT",
    "export_word_tooltip": "Export to Word",
    "generating_summary": "Generating AI summary...",
    "generating_note": "This may take a few seconds depending on the meeting length and the selected model.",
    "error_title": "An error occurred",
    "error_default": "Could not generate summary.",
    "retry": "Retry",
    "missing_transcript_error": "The meeting transcript could not be found. Please return to the homepage and generate the summary again."
  },
  es: {
    "title": "Traductor en Tiempo Real",
    "verifying_webgpu": "Verificando WebGPU...",
    "webgpu_ready": "WebGPU disponible",
    "webgpu_error": "WebGPU no disponible. Usando WASM (más lento)",
    "audio_source": "Fuente de Audio",
    "microphone": "Micrófono",
    "tab_audio": "Audio de Pestaña",
    "whisper_model": "Modelo Whisper",
    "fast": "Rápido",
    "balanced": "Balanceado",
    "accurate": "Preciso",
    "start_translation": "Iniciar Traducción",
    "stop_translation": "Detener Traducción",
    "loading_model": "Cargando modelo Whisper...",
    "loading_note": "Primera vez: ~200MB. Se guardará en caché.",
    "subtitles_title": "📝 Subtítulos en Tiempo Real",
    "listening": "Escuchando...",
    "empty_subtitles": "Los subtítulos aparecerán aquí",
    "empty_hint": "Selecciona una fuente de audio y presiona \"Iniciar Traducción\"",
    "chat_title": "🤖 Pregunta sobre la reunión",
    "chat_empty": "💡 Pregunta algo sobre la conversación",
    "chat_hint": "Ej: \"¿Qué se habló en la reunion?\"",
    "chat_placeholder": "Escribe tu pregunta...",
    "save": "Guardar",
    "footer_info": "🚀 Procesamiento local con WebGPU • 🔒 Tu audio nunca sale del navegador",
    "translating": "Traduciendo...",
    "no_transcript_error": "No hay transcripción disponible todavía. Inicia una grabación primero.",
    "empty_question_error": "Por favor, escribe una pregunta.",
    "ollama_connection_error": "Error al conectar con Ollama: {error}\n\nAsegúrate de que Ollama esté corriendo:\n1. Instala Ollama: https://ollama.ai\n2. Ejecuta: ollama run llama3.2\n3. Intenta de nuevo",
    "download_tooltip": "Descargar transcripción",
    "summary_tooltip": "Generar Resumen con IA",
    "close_summary_tooltip": "Cerrar Resumen",
    "summary_title": "Resumen Detallado de la Reunión",
    "regenerate_tooltip": "Regenerar Resumen",
    "export_txt_tooltip": "Exportar a TXT",
    "export_word_tooltip": "Exportar a Word",
    "generating_summary": "Generando resumen con Inteligencia Artificial...",
    "generating_note": "Esto puede tomar unos segundos dependiendo de la duración de tu reunión y del modelo seleccionado.",
    "error_title": "Ocurrió un error",
    "error_default": "No se pudo generar el resumen.",
    "retry": "Reintentar",
    "missing_transcript_error": "No se encontró la transcripción de la reunión. Por favor, vuelve a la página principal y genera el resumen nuevamente."
  }
};

let currentLanguage = localStorage.getItem("app_language") || "en";

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem("app_language", lang);
    document.documentElement.lang = lang;
    updateDOM();
    updateToggleButtons();
  }
}

export function t(key, replacements = {}) {
  let text = translations[currentLanguage][key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

export function updateDOM() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLanguage][key]) {
      // Check if we're replacing the whole content or keeping a child icon/element
      // Often, the text is inside a span next to an icon. 
      // If there's an element inside with class .btn-text or similar, update that instead
      
      const textNode = el.querySelector('.btn-text, .status-text, .selector-label, h2, h1, p:not(.chat-hint):not(.empty-hint), .empty-hint, .chat-hint, .model-name');
      
      if (textNode) {
          textNode.textContent = translations[currentLanguage][key];
      } else if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
          el.setAttribute("placeholder", translations[currentLanguage][key]);
      } else if (el.tagName === 'BUTTON' && el.hasAttribute('title')) {
          el.setAttribute("title", translations[currentLanguage][key]);
      } else {
        el.textContent = translations[currentLanguage][key];
      }
    }
  });
  
  // Handle mixed content cases directly if needed
  const btnStartText = document.querySelector("#btn-start .btn-content span:last-child");
  if (btnStartText && !document.querySelector("#btn-start").disabled) {
      // Update text depending on recording state. Main JS handles this. We shouldn't force it here if it might override "Stop"
      // Actually, better to dispatch an event to let main.js handle complex UI updates
  }
  
  document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: currentLanguage } }));
}

function updateToggleButtons() {
    const btnEn = document.getElementById("lang-en");
    const btnEs = document.getElementById("lang-es");
    if (btnEn && btnEs) {
        if (currentLanguage === "en") {
            btnEn.classList.add("active");
            btnEs.classList.remove("active");
        } else {
            btnEs.classList.add("active");
            btnEn.classList.remove("active");
        }
    }
}

export function initI18n() {
  document.documentElement.lang = currentLanguage;
  updateDOM();
  updateToggleButtons();
  
  const btnEn = document.getElementById("lang-en");
  const btnEs = document.getElementById("lang-es");
  
  if (btnEn) {
      btnEn.addEventListener("click", () => setLanguage("en"));
  }
  if (btnEs) {
      btnEs.addEventListener("click", () => setLanguage("es"));
  }
}
