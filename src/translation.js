/**
 * Translation Module
 * Handles English to Spanish translation using local OPUS-MT model via Transformers.js
 * 100% local - no external API calls needed
 */

import { pipeline, env } from "@huggingface/transformers";

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let translator = null;
let isLoading = false;

// Cache for recent translations
const translationCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * Initialize the translation pipeline
 * @param {Function} progressCallback - Progress callback for model loading
 */
export async function initializeTranslator(progressCallback) {
  if (translator) return translator;
  if (isLoading) return null;

  isLoading = true;

  try {
    // Check WebGPU support
    const hasWebGPU = "gpu" in navigator;
    const device = hasWebGPU ? "webgpu" : "wasm";

    console.log(`Initializing translator with device: ${device}`);

    // Use OPUS-MT English to Spanish model
    // This is a smaller, efficient model optimized for this language pair
    translator = await pipeline("translation", "Xenova/opus-mt-en-es", {
      device: device,
      dtype: device === "webgpu" ? "fp32" : "q8",
      progress_callback: progressCallback,
    });

    console.log("Translation pipeline initialized successfully");
    return translator;
  } catch (error) {
    console.error("Failed to initialize translator:", error);
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Check if translator is ready
 * @returns {boolean}
 */
export function isTranslatorReady() {
  return translator !== null;
}

/**
 * Translate text from English to Spanish
 * @param {string} text - English text to translate
 * @returns {Promise<string>} - Spanish translation
 */
export async function translateToSpanish(text) {
  if (!text || text.trim().length === 0) {
    return "";
  }

  const trimmedText = text.trim();

  // Check cache first
  if (translationCache.has(trimmedText)) {
    return translationCache.get(trimmedText);
  }

  if (!translator) {
    throw new Error(
      "Translator not initialized. Call initializeTranslator first."
    );
  }

  try {
    const result = await translator(trimmedText, {
      max_length: 512,
    });

    const translation = result[0].translation_text;

    // Cache the result
    cacheTranslation(trimmedText, translation);

    return translation;
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text with error indicator if translation fails
    return `[Error de traducción] ${trimmedText}`;
  }
}

/**
 * Add translation to cache with size limit
 * @param {string} original
 * @param {string} translation
 */
function cacheTranslation(original, translation) {
  // Remove oldest entries if cache is full
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(original, translation);
}

/**
 * Clear the translation cache
 */
export function clearTranslationCache() {
  translationCache.clear();
}
