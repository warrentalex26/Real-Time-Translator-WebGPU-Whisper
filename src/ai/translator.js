/**
 * General Text Translator
 * Uses the currently configured AI provider (Ollama or Gemini)
 */

import { AI_CONFIG } from "./config.js";
import { buildTranslationPrompt } from "./prompts.js";
import { chatWithOllama } from "./ollama.js";
import { chatWithGemini } from "./gemini.js";

/**
 * Translate text using the active AI provider
 * @param {string} text - Text to translate
 * @param {string} direction - Translation direction (e.g. 'en-es', 'es-en')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, direction = "en-es") {
  if (!text || text.trim().length === 0) {
    return "";
  }

  const prompt = buildTranslationPrompt(text.trim(), direction);

  try {
    if (AI_CONFIG.provider === "ollama") {
      return await chatWithOllama(prompt, "");
    } else {
      return await chatWithGemini(prompt, "");
    }
  } catch (error) {
    console.error("Translation error:", error);
    
    if (AI_CONFIG.provider === "ollama") {
      return `[Error: Unable to connect to Ollama. Make sure it's running.]`;
    }
    
    return `[Error: ${error.message}]`;
  }
}
