/**
 * AI Chat Module
 * Supports both Ollama (local) and Gemini API for transcript Q&A
 */

// AI Provider configuration
const AI_CONFIG = {
  // Default provider: 'ollama' or 'gemini'
  provider: "ollama",

  ollama: {
    baseUrl: "http://localhost:11434",
    model: "llama3.2", // Good balance of speed and quality
    numCtx: 32768, // Configurable context window (default was 2048). 32k is easily handled by an M4 Pro with 24GB RAM.
  },

  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-1.5-flash",
    apiKey: "", // Set via setGeminiApiKey()
  },
};

/**
 * Set the AI provider
 * @param {'ollama' | 'gemini'} provider
 */
export function setAIProvider(provider) {
  if (provider !== "ollama" && provider !== "gemini") {
    throw new Error('Provider must be "ollama" or "gemini"');
  }
  AI_CONFIG.provider = provider;
  console.log(`AI provider set to: ${provider}`);
}

/**
 * Get current AI provider
 * @returns {'ollama' | 'gemini'}
 */
export function getAIProvider() {
  return AI_CONFIG.provider;
}

/**
 * Set Gemini API key
 * @param {string} apiKey
 */
export function setGeminiApiKey(apiKey) {
  AI_CONFIG.gemini.apiKey = apiKey;
}

/**
 * Set Ollama model
 * @param {string} model
 */
export function setOllamaModel(model) {
  AI_CONFIG.ollama.model = model;
}

/**
 * Check if Ollama is available
 * @returns {Promise<boolean>}
 */
export async function checkOllamaAvailable() {
  try {
    const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/tags`, {
      method: "GET",
    });
    return response.ok;
  } catch (error) {
    console.warn("Ollama not available:", error.message);
    return false;
  }
}

/**
 * Get available Ollama models
 * @returns {Promise<string[]>}
 */
export async function getOllamaModels() {
  try {
    const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/tags`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.models?.map((m) => m.name) || [];
  } catch (error) {
    console.error("Failed to get Ollama models:", error);
    return [];
  }
}

/**
 * Build the system prompt for transcript Q&A
 * @param {string} transcriptContext
 * @returns {string}
 */
function buildSystemPrompt(transcriptContext) {
  return `You are an expert meeting analyst. You have access to a LITERAL transcript of a live meeting — every entry is an exact quote of what someone said, with timestamps.

CRITICAL RULES:
- The transcript is a VERBATIM record. When asked "what did they say/ask", quote the EXACT words from the transcript, not a paraphrase.
- Distinguish between QUESTIONS asked and STATEMENTS made. If the user asks "qué preguntaron" or "what did they ask", find entries that contain question marks or interrogative phrasing and quote them directly.
- Always reference the timestamp of the entry you're citing (e.g., "[03:55]").
- Be precise and specific. Do NOT give vague summaries when the user asks about specific things that were said.
- If the user asks a general question like "de qué están hablando" or "what are they discussing", THEN you can summarize the topics.
- If the information isn't in the transcript, say so clearly.

The context below may contain two sections:
1. "RESUMEN DE LO DISCUTIDO ANTERIORMENTE" — compressed summaries of earlier parts of the meeting
2. "TRANSCRIPCIÓN RECIENTE (DETALLADA)" — the most recent detailed transcript with timestamps

When the user asks about "what they are talking about NOW" or "right now", focus on the RECENT section.
When the user asks about earlier topics, use the SUMMARIES section.

MEETING TRANSCRIPT:
${transcriptContext}

Answer questions about this transcript in Spanish (the user prefers Spanish responses). When quoting what was said, include the original English text from the transcript.`;
}

/**
 * Chat with Ollama
 * @param {string} question
 * @param {string} transcriptContext
 * @returns {Promise<string>}
 */
async function chatWithOllama(question, transcriptContext) {
  const systemPrompt = buildSystemPrompt(transcriptContext);

  const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_CONFIG.ollama.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      stream: false,
      options: {
        num_ctx: AI_CONFIG.ollama.numCtx,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content || "No response from Ollama";
}

/**
 * Chat with Gemini API
 * @param {string} question
 * @param {string} transcriptContext
 * @returns {Promise<string>}
 */
async function chatWithGemini(question, transcriptContext) {
  if (!AI_CONFIG.gemini.apiKey) {
    throw new Error("Gemini API key not set. Call setGeminiApiKey() first.");
  }

  const systemPrompt = buildSystemPrompt(transcriptContext);
  const fullPrompt = `${systemPrompt}\n\nUser question: ${question}`;

  const response = await fetch(
    `${AI_CONFIG.gemini.baseUrl}/models/${AI_CONFIG.gemini.model}:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini error: ${response.status} - ${
        errorData.error?.message || response.statusText
      }`
    );
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini"
  );
}

/**
 * Ask a question about the transcript
 * @param {string} question - User's question
 * @param {string} transcriptContext - The meeting transcript
 * @returns {Promise<string>} - AI response
 */
export async function askAboutTranscript(question, transcriptContext) {
  if (!transcriptContext || transcriptContext.trim().length === 0) {
    return "No hay transcripción disponible todavía. Inicia una grabación primero.";
  }

  if (!question || question.trim().length === 0) {
    return "Por favor, escribe una pregunta.";
  }

  try {
    if (AI_CONFIG.provider === "ollama") {
      return await chatWithOllama(question, transcriptContext);
    } else {
      return await chatWithGemini(question, transcriptContext);
    }
  } catch (error) {
    console.error("AI chat error:", error);

    // If Ollama fails, suggest checking if it's running
    if (AI_CONFIG.provider === "ollama") {
      return `Error al conectar con Ollama: ${error.message}\n\nAsegúrate de que Ollama esté corriendo:\n1. Instala Ollama: https://ollama.ai\n2. Ejecuta: ollama run llama3.2\n3. Intenta de nuevo`;
    }

    return `Error: ${error.message}`;
  }
}

/**
 * Ask a question about the transcript with streaming response
 * Calls onToken for each token as it arrives (ChatGPT-style)
 * @param {string} question - User's question
 * @param {string} transcriptContext - The meeting transcript
 * @param {Function} onToken - Callback called with each token: onToken(tokenText)
 * @param {Function} onDone - Callback called when streaming is complete: onDone(fullText)
 * @param {Function} onError - Callback called on error: onError(errorMessage)
 */
export async function askAboutTranscriptStreaming(
  question,
  transcriptContext,
  onToken,
  onDone,
  onError
) {
  if (!transcriptContext || transcriptContext.trim().length === 0) {
    onDone("No hay transcripción disponible todavía. Inicia una grabación primero.");
    return;
  }

  if (!question || question.trim().length === 0) {
    onDone("Por favor, escribe una pregunta.");
    return;
  }

  try {
    if (AI_CONFIG.provider === "ollama") {
      await streamFromOllama(question, transcriptContext, onToken, onDone);
    } else {
      await streamFromGemini(question, transcriptContext, onToken, onDone);
    }
  } catch (error) {
    console.error("AI streaming error:", error);
    const errorMsg =
      AI_CONFIG.provider === "ollama"
        ? `Error al conectar con Ollama: ${error.message}\n\nAsegúrate de que Ollama esté corriendo:\n1. Instala Ollama: https://ollama.ai\n2. Ejecuta: ollama run llama3.2\n3. Intenta de nuevo`
        : `Error: ${error.message}`;
    onError(errorMsg);
  }
}

/**
 * Stream response from Ollama (NDJSON format)
 */
async function streamFromOllama(question, transcriptContext, onToken, onDone) {
  const systemPrompt = buildSystemPrompt(transcriptContext);

  const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_CONFIG.ollama.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      stream: true,
      options: {
        num_ctx: AI_CONFIG.ollama.numCtx,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // Ollama streams NDJSON — one JSON object per line
    const lines = chunk.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const token = parsed.message?.content || "";
        if (token) {
          fullText += token;
          onToken(token);
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  onDone(fullText);
}

/**
 * Stream response from Gemini (SSE format)
 */
async function streamFromGemini(question, transcriptContext, onToken, onDone) {
  if (!AI_CONFIG.gemini.apiKey) {
    throw new Error("Gemini API key not set. Call setGeminiApiKey() first.");
  }

  const systemPrompt = buildSystemPrompt(transcriptContext);
  const fullPrompt = `${systemPrompt}\n\nUser question: ${question}`;

  const response = await fetch(
    `${AI_CONFIG.gemini.baseUrl}/models/${AI_CONFIG.gemini.model}:streamGenerateContent?key=${AI_CONFIG.gemini.apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini error: ${response.status} - ${
        errorData.error?.message || response.statusText
      }`
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // Gemini SSE: lines starting with "data: " contain JSON
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(line.slice(6));
          const token =
            parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (token) {
            fullText += token;
            onToken(token);
          }
        } catch {
          // Skip malformed data
        }
      }
    }
  }

  onDone(fullText);
}

/**
 * Compress a block of transcript entries into a short summary
 * @param {Array} entries - Array of {relativeTime, original} entries
 * @returns {Promise<string>} - Compressed summary (3-5 sentences)
 */
export async function compressTranscriptBlock(entries) {
  if (!entries || entries.length === 0) {
    return "";
  }

  const blockText = entries
    .map((e) => `[${e.relativeTime}] ${e.original}`)
    .join("\n");

  const compressionPrompt = `You are summarizing a segment of a meeting transcript.
Condense the following transcript segment into 3-5 concise sentences in Spanish.
Capture the KEY topics discussed, any decisions made, and important details.
Do NOT include timestamps in your summary. Be factual and concise.

TRANSCRIPT SEGMENT:
${blockText}

SUMMARY (in Spanish, 3-5 sentences):`;

  try {
    if (AI_CONFIG.provider === "ollama") {
      const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_CONFIG.ollama.model,
          messages: [
            { role: "system", content: compressionPrompt },
            { role: "user", content: "Genera el resumen conciso del segmento." },
          ],
          stream: false,
          options: { num_ctx: 8192 },
        }),
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
      const data = await response.json();
      return data.message?.content || "";
    } else {
      if (!AI_CONFIG.gemini.apiKey) return "";

      const response = await fetch(
        `${AI_CONFIG.gemini.baseUrl}/models/${AI_CONFIG.gemini.model}:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: compressionPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
          }),
        }
      );

      if (!response.ok) return "";
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
  } catch (error) {
    console.error("Compression error:", error);
    return "";
  }
}

/**
 * Generate an automatic insight about what's being discussed right now
 * @param {string} recentContext - Recent transcript entries
 * @returns {Promise<string>} - Short insight (2-3 sentences)
 */
export async function generateAutoInsight(recentContext) {
  if (!recentContext || recentContext.trim().length === 0) {
    return "";
  }

  const insightPrompt = `Based on the following recent meeting transcript, describe in 2-3 sentences what they are discussing RIGHT NOW.
Be specific and concise. Mention the current topic and any key points.
Respond in Spanish.

RECENT TRANSCRIPT:
${recentContext}

CURRENT TOPIC (2-3 sentences in Spanish):`;

  try {
    if (AI_CONFIG.provider === "ollama") {
      const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_CONFIG.ollama.model,
          messages: [
            { role: "system", content: insightPrompt },
            { role: "user", content: "¿De qué están hablando ahora mismo?" },
          ],
          stream: false,
          options: { num_ctx: 4096 },
        }),
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
      const data = await response.json();
      return data.message?.content || "";
    } else {
      if (!AI_CONFIG.gemini.apiKey) return "";

      const response = await fetch(
        `${AI_CONFIG.gemini.baseUrl}/models/${AI_CONFIG.gemini.model}:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: insightPrompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 256 },
          }),
        }
      );

      if (!response.ok) return "";
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
  } catch (error) {
    console.error("Auto-insight error:", error);
    return "";
  }
}

/**
 * Generate a detailed summary of the meeting
 * @param {string} transcriptContext - The meeting transcript
 * @returns {Promise<string>} - Detailed AI summary
 */
export async function generateSummary(transcriptContext) {
  if (!transcriptContext || transcriptContext.trim().length === 0) {
    throw new Error("No hay transcripción disponible para resumir.");
  }

  const systemPrompt = `You are an expert executive assistant analyzing a meeting transcript. 
Tu tarea es generar un resumen detallado y estructurado de la reunión en español.

Por favor, estructura tu respuesta en formato Markdown con las siguientes secciones:
1. **Resumen Ejecutivo**: Un párrafo corto (3-4 líneas) con la esencia de la reunión.
2. **Puntos Clave Discutidos**: Una lista de los temas principales que se abordaron.
3. **Decisiones Tomadas**: Cualquier acuerdo o decisión final mencionada en el texto. Si no hay, indícalo.
4. **Próximos Pasos / Tareas**: Acciones a realizar, asignadas a personas si se mencionan.

Sé profesional, conciso pero suficientemente detallado para que alguien que no asistió pueda entender perfectamente lo que pasó.

TRANSCRIPCIÓN DE LA REUNIÓN:
${transcriptContext}

RECUERDA: Responde siempre en Español y usa el formato Markdown solicitado.`;

  try {
    if (AI_CONFIG.provider === "ollama") {
      const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_CONFIG.ollama.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Genera el resumen detallado de la reunión según las instrucciones." }
          ],
          stream: false,
          options: {
            num_ctx: AI_CONFIG.ollama.numCtx,
          },
        }),
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      const data = await response.json();
      return data.message?.content || "No se pudo generar el resumen.";
    } else {
      if (!AI_CONFIG.gemini.apiKey) {
        throw new Error("Gemini API key no configurada.");
      }

      const fullPrompt = `${systemPrompt}\n\nGenera el resumen detallado de la reunión según las instrucciones.`;
      const response = await fetch(
        `${AI_CONFIG.gemini.baseUrl}/models/${AI_CONFIG.gemini.model}:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar el resumen.";
    }
  } catch (error) {
    console.error("Summary generation error:", error);
    throw error;
  }
}
