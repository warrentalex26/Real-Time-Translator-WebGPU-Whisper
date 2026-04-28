/**
 * AI Configuration Module
 * Centralized configuration and provider management for AI services
 */

// AI Provider configuration
export const AI_CONFIG = {
  // Default provider: 'ollama' or 'gemini'
  provider: "ollama",

  ollama: {
    baseUrl: "http://localhost:11434",
    model: "llama3.2", // Good balance of speed and quality
    numCtx: 32768, // 32k context window — easily handled by M4 Pro with 24GB RAM
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
