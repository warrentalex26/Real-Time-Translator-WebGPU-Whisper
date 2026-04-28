/**
 * Ollama API Module
 * All API interactions with the local Ollama instance
 */

import { AI_CONFIG } from "./config.js";
import { buildSystemPrompt } from "./prompts.js";

/**
 * Chat with Ollama (non-streaming)
 * @param {string} question
 * @param {string} transcriptContext
 * @returns {Promise<string>}
 */
export async function chatWithOllama(question, transcriptContext) {
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
 * Stream response from Ollama (NDJSON format)
 * @param {string} question
 * @param {string} transcriptContext
 * @param {Function} onToken - Called with each token
 * @param {Function} onDone - Called when streaming is complete
 */
export async function streamFromOllama(
  question,
  transcriptContext,
  onToken,
  onDone
) {
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
 * Compress a transcript block via Ollama
 * @param {string} compressionPrompt - The compression prompt
 * @returns {Promise<string>}
 */
export async function compressViaOllama(compressionPrompt) {
  const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_CONFIG.ollama.model,
      messages: [
        { role: "system", content: compressionPrompt },
        {
          role: "user",
          content: "Genera el resumen conciso del segmento.",
        },
      ],
      stream: false,
      options: { num_ctx: 8192 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json();
  return data.message?.content || "";
}

/**
 * Generate an auto-insight via Ollama
 * @param {string} insightPrompt - The insight prompt
 * @returns {Promise<string>}
 */
export async function insightViaOllama(insightPrompt) {
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
}

/**
 * Generate a detailed summary via Ollama
 * @param {string} summaryPrompt - The summary prompt
 * @returns {Promise<string>}
 */
export async function summaryViaOllama(summaryPrompt) {
  const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_CONFIG.ollama.model,
      messages: [
        { role: "system", content: summaryPrompt },
        {
          role: "user",
          content:
            "Genera el resumen detallado de la reunión según las instrucciones.",
        },
      ],
      stream: false,
      options: {
        num_ctx: AI_CONFIG.ollama.numCtx,
      },
    }),
  });

  if (!response.ok)
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.message?.content || "No se pudo generar el resumen.";
}
