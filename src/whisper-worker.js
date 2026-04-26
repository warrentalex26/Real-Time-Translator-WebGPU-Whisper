/**
 * Whisper Web Worker
 * Handles Whisper model loading and transcription using WebGPU
 * Supports multiple model sizes for quality/speed trade-off
 */

import { pipeline, env } from "@huggingface/transformers";

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;
let isLoading = false;
let isBusy = false;
let pendingAudio = null; // Accumulate audio while busy

// Available Whisper models
const WHISPER_MODELS = {
  tiny: {
    id: "onnx-community/whisper-tiny",
    label: "⚡ Rápido",
    size: "~39MB",
  },
  base: {
    id: "onnx-community/whisper-base",
    label: "⚖️ Balanceado",
    size: "~74MB",
  },
  small: {
    id: "onnx-community/whisper-small",
    label: "🎯 Preciso",
    size: "~244MB",
  },
};

/**
 * Initialize the Whisper pipeline with WebGPU
 * @param {string} modelKey - Model key: 'tiny', 'base', or 'small'
 * @param {Function} progressCallback - Progress callback
 */
async function initializePipeline(modelKey, progressCallback) {
  if (transcriber) return transcriber;
  if (isLoading) return null;

  isLoading = true;

  const model = WHISPER_MODELS[modelKey] || WHISPER_MODELS.base;

  try {
    // Check WebGPU support
    const hasWebGPU = "gpu" in navigator;
    const device = hasWebGPU ? "webgpu" : "wasm";

    console.log(
      `Initializing Whisper (${model.label}) with device: ${device}`
    );

    // Create the transcription pipeline
    transcriber = await pipeline(
      "automatic-speech-recognition",
      model.id,
      {
        device: device,
        dtype: device === "webgpu" ? "fp32" : "q8",
        progress_callback: progressCallback,
      }
    );

    console.log("Whisper pipeline initialized successfully");
    return transcriber;
  } catch (error) {
    console.error("Failed to initialize Whisper:", error);
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Merge multiple Float32Arrays into one
 * @param {Float32Array} existing - Existing accumulated audio
 * @param {Float32Array} incoming - New audio chunk
 * @returns {Float32Array} - Merged audio
 */
function mergeAudio(existing, incoming) {
  if (!existing) return incoming;
  const merged = new Float32Array(existing.length + incoming.length);
  merged.set(existing, 0);
  merged.set(incoming, existing.length);
  return merged;
}

/**
 * Transcribe audio data
 * @param {Float32Array} audioData - 16kHz mono audio data
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribe(audioData) {
  if (!transcriber) {
    throw new Error("Transcriber not initialized");
  }

  try {
    const result = await transcriber(audioData, {
      language: "english",
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    return result.text.trim();
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

/**
 * Process transcription and handle pending audio
 * @param {Float32Array} audioData - Audio data to transcribe
 */
async function processTranscription(audioData) {
  isBusy = true;
  pendingAudio = null;

  try {
    const text = await transcribe(audioData);
    if (text && text.length > 0) {
      self.postMessage({
        type: "transcription",
        data: text,
      });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      data: error.message,
    });
  } finally {
    isBusy = false;

    // If audio accumulated while we were busy, process it now
    if (pendingAudio) {
      const accumulated = pendingAudio;
      processTranscription(accumulated);
    }
  }
}

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "init":
      try {
        const modelKey = data?.model || "base";
        await initializePipeline(modelKey, (progress) => {
          self.postMessage({
            type: "progress",
            data: progress,
          });
        });
        self.postMessage({ type: "ready" });
      } catch (error) {
        self.postMessage({
          type: "error",
          data: error.message,
        });
      }
      break;

    case "transcribe":
      if (isBusy) {
        // Don't queue — merge into pending audio for next batch
        pendingAudio = mergeAudio(pendingAudio, data);
        return;
      }
      processTranscription(data);
      break;

    case "getModels":
      self.postMessage({
        type: "models",
        data: WHISPER_MODELS,
      });
      break;

    case "stop":
      // Clean up if needed
      pendingAudio = null;
      break;

    default:
      console.warn("Unknown message type:", type);
  }
};
