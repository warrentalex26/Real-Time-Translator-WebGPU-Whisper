/**
 * Gemini API Module
 * All API interactions with the Google Gemini API
 */

import { AI_CONFIG } from "./config.js";
import { buildSystemPrompt } from "./prompts.js";

/**
 * Chat with Gemini API (non-streaming)
 * @param {string} question
 * @param {string} transcriptContext
 * @returns {Promise<string>}
 */
export async function chatWithGemini(question, transcriptContext) {
  if (!AI_CONFIG.gemini.apiKey) {
    throw new Error("Gemini API key not set. Call setGeminiApiKey() first.");
  }

  const systemPrompt = buildSystemPrompt(transcriptContext);
  const fullPrompt = `${systemPrompt}\n\nUser question: ${question}`;

  const response = await fetch(
    `${AI_CONFIG.gemini.baseUrl}/models/${AI_CONFIG.gemini.model}:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
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

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini"
  );
}

/**
 * Stream response from Gemini (SSE format)
 * @param {string} question
 * @param {string} transcriptContext
 * @param {Function} onToken - Called with each token
 * @param {Function} onDone - Called when streaming is complete
 */
export async function streamFromGemini(
  question,
  transcriptContext,
  onToken,
  onDone
) {
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
 * Compress a transcript block via Gemini
 * @param {string} compressionPrompt - The compression prompt
 * @returns {Promise<string>}
 */
export async function compressViaGemini(compressionPrompt) {
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

/**
 * Generate an auto-insight via Gemini
 * @param {string} insightPrompt - The insight prompt
 * @returns {Promise<string>}
 */
export async function insightViaGemini(insightPrompt) {
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

/**
 * Generate a detailed summary via Gemini
 * @param {string} summaryPrompt - The summary prompt
 * @returns {Promise<string>}
 */
export async function summaryViaGemini(summaryPrompt) {
  if (!AI_CONFIG.gemini.apiKey) {
    throw new Error("Gemini API key no configurada.");
  }

  const fullPrompt = `${summaryPrompt}\n\nGenera el resumen detallado de la reunión según las instrucciones.`;
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
    throw new Error(
      `Gemini error: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No se pudo generar el resumen."
  );
}
