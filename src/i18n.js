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
    "missing_transcript_error": "The meeting transcript could not be found. Please return to the homepage and generate the summary again.",
    "auto_insight_label": "Auto-Insights",
    "auto_insight_badge": "⚡ Auto-Insight",
    "auto_insight_generating": "Generating insight...",
    "auto_insight_enabled": "Auto-Insights enabled",
    "auto_insight_disabled": "Auto-Insights disabled",
    "live_transcript": "Live Transcript",
    "setup_tab": "Setup",
    "translator_tab": "Translator",
    "translate_action": "Translate",
    "translate_placeholder": "Type or paste text to translate...",
    "en_to_es": "English to Spanish",
    "es_to_en": "Spanish to English",
    "save_recording": "Save Recording",
    "recording_name": "Recording Name",
    "generating_title_placeholder": "Generating title...",
    "project_label": "Project",
    "category_label": "Category",
    "tags_label": "Tags",
    "add_tag_placeholder": "Add tag...",
    "entries_label": "entries",
    "save_to_notion": "Save to Notion",
    "download_txt": "Download TXT",
    "cancel": "Cancel",
    "new_project_tooltip": "New project",
    "new_project_prompt": "Enter the name for the new project:",
    "creating_project": "Creating project...",
    "project_created": "Project created!",
    "loading_projects": "Loading projects...",
    "no_projects": "No projects yet",
    "title_required": "A title is required.",
    "saving_to_notion": "Saving to Notion...",
    "saved_successfully": "Saved successfully!",
    "save_failed": "Failed to save",

    "nav_home": "Home",
    "nav_search": "Search Recordings",
    "search_page_title": "Search Recordings | TraductorWebGPU",
    "search_recordings_title": "Search Recordings",
    "search_description": "Ask questions about your saved meeting transcripts in natural language.",
    "back_to_dashboard": "Back to Dashboard",
    "search_in_label": "Search in",
    "all_projects": "All Projects",
    "search_placeholder": "Did anyone mention ticket WSC-1313?",
    "search_btn": "Search",
    "extracting_keywords": "Extracting keywords...",
    "searching_notion": "Searching in Notion...",
    "analyzing_results": "Analyzing with AI...",
    "sources_found": "Sources found",
    "ai_response_label": "AI Response",
    "search_empty_text": "Search across your saved meeting transcripts.",
    "search_examples": "Try: \"Was ticket WSC-1313 discussed?\" or \"When did Alex mention the Amplience feature?\"",
    "no_results_found": "No matching transcripts found.",
    "no_results_hint": "Try different keywords or search in a different project.",
    "search_error": "Search error",
    "no_ai_response": "Could not generate an AI response.",
    "found_in_transcripts": "Found in the following transcripts"
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
    "missing_transcript_error": "No se encontró la transcripción de la reunión. Por favor, vuelve a la página principal y genera el resumen nuevamente.",
    "auto_insight_label": "Auto-Insights",
    "auto_insight_badge": "⚡ Auto-Insight",
    "auto_insight_generating": "Generando insight...",
    "auto_insight_enabled": "Auto-Insights activados",
    "auto_insight_disabled": "Auto-Insights desactivados",
    "live_transcript": "Transcripción en Vivo",
    "setup_tab": "Configuración",
    "translator_tab": "Traductor",
    "translate_action": "Traducir",
    "translate_placeholder": "Escribe o pega texto para traducir...",
    "en_to_es": "Inglés a Español",
    "es_to_en": "Español a Inglés",
    "save_recording": "Guardar Grabación",
    "recording_name": "Nombre de la Grabación",
    "generating_title_placeholder": "Generando título...",
    "project_label": "Proyecto",
    "category_label": "Categoría",
    "tags_label": "Etiquetas",
    "add_tag_placeholder": "Agregar etiqueta...",
    "entries_label": "entradas",
    "save_to_notion": "Guardar en Notion",
    "download_txt": "Descargar TXT",
    "cancel": "Cancelar",
    "new_project_tooltip": "Nuevo proyecto",
    "new_project_prompt": "Ingresa el nombre del nuevo proyecto:",
    "creating_project": "Creando proyecto...",
    "project_created": "¡Proyecto creado!",
    "loading_projects": "Cargando proyectos...",
    "no_projects": "No hay proyectos aún",
    "title_required": "Se requiere un título.",
    "saving_to_notion": "Guardando en Notion...",
    "saved_successfully": "¡Guardado exitosamente!",
    "save_failed": "Error al guardar",

    "nav_home": "Inicio",
    "nav_search": "Buscar Grabaciones",
    "search_page_title": "Buscar Grabaciones | TraductorWebGPU",
    "search_recordings_title": "Buscar Grabaciones",
    "search_description": "Haz preguntas sobre tus transcripciones guardadas en lenguaje natural.",
    "back_to_dashboard": "Volver al Dashboard",
    "search_in_label": "Buscar en",
    "all_projects": "Todos los Proyectos",
    "search_placeholder": "¿Se mencionó el ticket WSC-1313?",
    "search_btn": "Buscar",
    "extracting_keywords": "Extrayendo palabras clave...",
    "searching_notion": "Buscando en Notion...",
    "analyzing_results": "Analizando con IA...",
    "sources_found": "Fuentes encontradas",
    "ai_response_label": "Respuesta de IA",
    "search_empty_text": "Busca en tus transcripciones de reuniones guardadas.",
    "search_examples": "Prueba: \"¿Se habló del ticket WSC-1313?\" o \"¿Cuándo Alex mencionó el feature de Amplience?\"",
    "no_results_found": "No se encontraron transcripciones coincidentes.",
    "no_results_hint": "Intenta con otras palabras clave o busca en otro proyecto.",
    "search_error": "Error de búsqueda",
    "no_ai_response": "No se pudo generar una respuesta de IA.",
    "found_in_transcripts": "Encontrado en las siguientes transcripciones"
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
      } else if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.hasAttribute('placeholder')) {
          el.setAttribute("placeholder", translations[currentLanguage][key]);
      } else if (el.tagName === 'BUTTON' && el.hasAttribute('title')) {
          el.setAttribute("title", translations[currentLanguage][key]);
      } else {
        el.textContent = translations[currentLanguage][key];
      }
    }
  });

  // Handle elements with specific data-i18n-placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[currentLanguage][key]) {
      el.setAttribute("placeholder", translations[currentLanguage][key]);
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
