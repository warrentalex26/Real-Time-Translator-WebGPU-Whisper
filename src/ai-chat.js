/**
 * AI Chat Module — Orchestration Facade
 * Re-exports config functions and orchestrates AI features
 * using provider-specific modules (ollama.js, gemini.js)
 */

// Re-export configuration functions (zero breaking changes for consumers)
export {
  setAIProvider,
  getAIProvider,
  setGeminiApiKey,
  setOllamaModel,
  checkOllamaAvailable,
  getOllamaModels,
} from "./ai/config.js";

import { AI_CONFIG } from "./ai/config.js";
import {
  buildCompressionPrompt,
  buildInsightPrompt,
  buildSummaryPrompt,
} from "./ai/prompts.js";
import {
  chatWithOllama,
  streamFromOllama,
  compressViaOllama,
  insightViaOllama,
  summaryViaOllama,
} from "./ai/ollama.js";
import {
  chatWithGemini,
  streamFromGemini,
  compressViaGemini,
  insightViaGemini,
  summaryViaGemini,
} from "./ai/gemini.js";

// ============================================
// Chat Q&A
// ============================================

/**
 * Ask a question about the transcript (non-streaming)
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

    if (AI_CONFIG.provider === "ollama") {
      return `Error al conectar con Ollama: ${error.message}\n\nAsegúrate de que Ollama esté corriendo:\n1. Instala Ollama: https://ollama.ai\n2. Ejecuta: ollama run llama3.2\n3. Intenta de nuevo`;
    }

    return `Error: ${error.message}`;
  }
}

// ============================================
// Streaming Chat
// ============================================

/**
 * Ask a question with streaming response (ChatGPT-style)
 * @param {string} question
 * @param {string} transcriptContext
 * @param {Function} onToken - Called with each token as it arrives
 * @param {Function} onDone - Called when streaming is complete
 * @param {Function} onError - Called on error
 */
export async function askAboutTranscriptStreaming(
  question,
  transcriptContext,
  onToken,
  onDone,
  onError
) {
  if (!transcriptContext || transcriptContext.trim().length === 0) {
    onDone(
      "No hay transcripción disponible todavía. Inicia una grabación primero."
    );
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

// ============================================
// Transcript Compression
// ============================================

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

  const prompt = buildCompressionPrompt(blockText);

  try {
    if (AI_CONFIG.provider === "ollama") {
      return await compressViaOllama(prompt);
    } else {
      return await compressViaGemini(prompt);
    }
  } catch (error) {
    console.error("Compression error:", error);
    return "";
  }
}

// ============================================
// Auto-Insights
// ============================================

/**
 * Generate an automatic insight about what's being discussed right now
 * @param {string} recentContext - Recent transcript entries
 * @returns {Promise<string>} - Short insight (2-3 sentences)
 */
export async function generateAutoInsight(recentContext) {
  if (!recentContext || recentContext.trim().length === 0) {
    return "";
  }

  const prompt = buildInsightPrompt(recentContext);

  try {
    if (AI_CONFIG.provider === "ollama") {
      return await insightViaOllama(prompt);
    } else {
      return await insightViaGemini(prompt);
    }
  } catch (error) {
    console.error("Auto-insight error:", error);
    return "";
  }
}

// ============================================
// Meeting Summary
// ============================================

/**
 * Generate a detailed summary of the meeting
 * @param {string} transcriptContext - The meeting transcript
 * @returns {Promise<string>} - Detailed AI summary in Markdown
 */
export async function generateSummary(transcriptContext) {
  if (!transcriptContext || transcriptContext.trim().length === 0) {
    throw new Error("No hay transcripción disponible para resumir.");
  }

  const prompt = buildSummaryPrompt(transcriptContext);

  try {
    if (AI_CONFIG.provider === "ollama") {
      return await summaryViaOllama(prompt);
    } else {
      return await summaryViaGemini(prompt);
    }
  } catch (error) {
    console.error("Summary generation error:", error);
    throw error;
  }
}
