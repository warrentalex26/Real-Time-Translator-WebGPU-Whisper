/**
 * Main Application
 * Real-time translator using WebGPU Whisper for transcription
 * and OPUS-MT for English to Spanish translation
 * With AI chat for transcript Q&A (Ollama/Gemini)
 */

import {
  getMicrophoneStream,
  getTabAudioStream,
  AudioProcessor,
} from "./audio-capture.js";
import { translateToSpanish, initializeTranslator } from "./translation.js";
import { transcriptManager } from "./transcript-manager.js";
import {
  askAboutTranscript,
  setAIProvider,
  setGeminiApiKey,
  checkOllamaAvailable,
  getAIProvider,
  compressTranscriptBlock,
  generateAutoInsight,
} from "./ai-chat.js";
import { initI18n, t, getLanguage } from "./i18n.js";
import { Header } from "./components/Header.js";
import { Footer } from "./components/Footer.js";

// Inject shared components first
const appHeader = document.getElementById("app-header");
const appFooter = document.getElementById("app-footer");
if (appHeader) appHeader.innerHTML = Header();
if (appFooter) appFooter.innerHTML = Footer();

// DOM Elements - Main
const webgpuStatus = document.getElementById("webgpu-status");
const btnMicrophone = document.getElementById("btn-microphone");
const btnTab = document.getElementById("btn-tab");
const btnStart = document.getElementById("btn-start");
const btnSummary = document.getElementById("btn-summary");
const btnDownload = document.getElementById("btn-download");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const progressPercent = document.getElementById("progress-percent");
const subtitlesContainer = document.getElementById("subtitles-container");
const emptyState = document.getElementById("empty-state");
const recordingIndicator = document.getElementById("recording-indicator");

// DOM Elements - Model Selector
const modelButtons = document.querySelectorAll(".model-btn");

// DOM Elements - AI Chat
const btnOllama = document.getElementById("btn-ollama");
const btnGemini = document.getElementById("btn-gemini");
const geminiKeyContainer = document.getElementById("gemini-key-container");
const geminiApiKeyInput = document.getElementById("gemini-api-key");
const btnSaveKey = document.getElementById("btn-save-key");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const btnSend = document.getElementById("btn-send");

// DOM Elements - Auto-Insights
const autoInsightToggle = document.getElementById("auto-insight-toggle");
const autoInsightInterval = document.getElementById("auto-insight-interval");

// State
let audioSource = "microphone";
let selectedModel = "base"; // default model
let isRecording = false;
let whisperWorker = null;
let audioProcessor = null;
let modelsReady = false;
let isChatLoading = false;
let autoInsightTimer = null;
let autoInsightEnabled = true;
let autoInsightIntervalMs = 60000; // 1 min default

// Initialize app
document.addEventListener("DOMContentLoaded", init);

async function init() {
  initI18n();
  checkWebGPUSupport();
  setupEventListeners();
  await checkOllamaStatus();
  loadSavedApiKey();
  loadSavedModel();
  loadAutoInsightPrefs();
  
  // Listen for language changes to update specific UI parts
  document.addEventListener("languageChanged", updateDynamicUI);
}

function updateDynamicUI() {
  // Update button text depending on recording state
  const btnStartText = btnStart.querySelector(".btn-content span:last-child");
  if (btnStartText) {
    btnStartText.textContent = isRecording ? t("stop_translation") : t("start_translation");
  }
}

/**
 * Check WebGPU support and update UI
 */
function checkWebGPUSupport() {
  const hasWebGPU = "gpu" in navigator;
  const statusText = webgpuStatus.querySelector(".status-text");

  if (hasWebGPU) {
    webgpuStatus.classList.add("ready");
    statusText.textContent = t("webgpu_ready");
    btnStart.disabled = false;
  } else {
    webgpuStatus.classList.remove("ready");
    statusText.textContent = t("webgpu_error");
    btnStart.disabled = false;
  }
}

/**
 * Check if Ollama is available
 */
async function checkOllamaStatus() {
  const isAvailable = await checkOllamaAvailable();
  if (!isAvailable) {
    // Switch to Gemini if Ollama not available
    console.log("Ollama not available, consider using Gemini");
  }
}

/**
 * Load saved Gemini API key from localStorage
 */
function loadSavedApiKey() {
  const savedKey = localStorage.getItem("gemini_api_key");
  if (savedKey) {
    setGeminiApiKey(savedKey);
    geminiApiKeyInput.value = "••••••••••••••••";
  }
}

/**
 * Load saved model preference from localStorage
 */
function loadSavedModel() {
  const saved = localStorage.getItem("whisper_model");
  if (saved && ["tiny", "base", "small"].includes(saved)) {
    selectedModel = saved;
  }
  // Update UI
  modelButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.model === selectedModel);
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Source selection
  btnMicrophone.addEventListener("click", () => selectSource("microphone"));
  btnTab.addEventListener("click", () => selectSource("tab"));

  // Model selection
  modelButtons.forEach((btn) => {
    btn.addEventListener("click", () => selectModel(btn.dataset.model));
  });

  // Start/Stop button
  btnStart.addEventListener("click", toggleRecording);

  // Summary button
  btnSummary.addEventListener("click", generateSummaryPage);

  // Download button
  btnDownload.addEventListener("click", downloadTranscript);

  // AI Provider toggle
  btnOllama.addEventListener("click", () => selectAIProvider("ollama"));
  btnGemini.addEventListener("click", () => selectAIProvider("gemini"));

  // Save Gemini API key
  btnSaveKey.addEventListener("click", saveGeminiApiKey);

  // Chat input
  btnSend.addEventListener("click", sendChatMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Auto-Insight controls
  autoInsightToggle.addEventListener("change", (e) => {
    autoInsightEnabled = e.target.checked;
    localStorage.setItem("auto_insight_enabled", autoInsightEnabled);
    
    if (isRecording) {
      if (autoInsightEnabled) {
        startAutoInsightTimer();
      } else {
        stopAutoInsightTimer();
      }
    }
  });

  autoInsightInterval.addEventListener("change", (e) => {
    autoInsightIntervalMs = parseInt(e.target.value, 10);
    localStorage.setItem("auto_insight_interval", autoInsightIntervalMs);
    
    // Restart timer with new interval if recording
    if (isRecording && autoInsightEnabled) {
      stopAutoInsightTimer();
      startAutoInsightTimer();
    }
  });
}

/**
 * Select audio source
 */
function selectSource(source) {
  audioSource = source;
  btnMicrophone.classList.toggle("active", source === "microphone");
  btnTab.classList.toggle("active", source === "tab");
}

/**
 * Select Whisper model
 */
function selectModel(model) {
  if (isRecording) return; // Don't allow model change while recording

  selectedModel = model;
  localStorage.setItem("whisper_model", model);

  modelButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.model === model);
  });

  // Reset models so they reinitialize with new selection
  if (modelsReady) {
    modelsReady = false;
    if (whisperWorker) {
      whisperWorker.terminate();
      whisperWorker = null;
    }
  }
}

/**
 * Select AI provider
 */
function selectAIProvider(provider) {
  setAIProvider(provider);
  btnOllama.classList.toggle("active", provider === "ollama");
  btnGemini.classList.toggle("active", provider === "gemini");
  geminiKeyContainer.classList.toggle("hidden", provider !== "gemini");
}

/**
 * Save Gemini API key
 */
function saveGeminiApiKey() {
  const key = geminiApiKeyInput.value.trim();
  if (key && !key.startsWith("•")) {
    localStorage.setItem("gemini_api_key", key);
    setGeminiApiKey(key);
    geminiApiKeyInput.value = "••••••••••••••••";
    showChatMessage(getLanguage() === "es" ? "API key guardada ✓" : "API key saved ✓", "assistant");
  }
}

/**
 * Download transcript as text file
 */
function downloadTranscript() {
  if (transcriptManager.count === 0) {
    showError(t("no_transcript_error"));
    return;
  }
  transcriptManager.downloadAsFile("bilingual");
}

/**
 * Handle Generate Summary click
 */
function generateSummaryPage() {
  const context = transcriptManager.getAIContext();
  if (!context || context.trim().length === 0 || context === "No transcript available yet.") {
    showError(t("no_transcript_error"));
    return;
  }
  
  // Save transcript to local storage for the summary page to use
  localStorage.setItem("temp_transcript_summary", context);
  
  // Open summary page in a new tab
  window.open("/pages/summary.html", "_blank");
}

/**
 * Toggle recording state
 */
async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

/**
 * Start recording and transcription
 */
async function startRecording() {
  try {
    btnStart.disabled = true;

    // Disable model selector while recording
    modelButtons.forEach((btn) => (btn.disabled = true));

    // Initialize models if not ready
    if (!modelsReady) {
      await initializeModels();
    }

    // Start transcript session
    transcriptManager.startSession();

    // Get audio stream
    let stream;
    if (audioSource === "microphone") {
      stream = await getMicrophoneStream();
    } else {
      stream = await getTabAudioStream();
    }

    // Start audio processing
    audioProcessor = new AudioProcessor((audioData) => {
      if (whisperWorker && isRecording) {
        whisperWorker.postMessage({
          type: "transcribe",
          data: audioData,
        });
      }
    });

    await audioProcessor.start(stream);

    // Update UI
    isRecording = true;
    btnStart.innerHTML = `
      <span class="btn-content">
        <span class="play-icon">⏹</span>
        <span>${t("stop_translation")}</span>
      </span>
    `;
    btnStart.classList.add("recording");
    btnStart.disabled = false;
    recordingIndicator.classList.remove("hidden");
    emptyState.classList.add("hidden");

    // Start auto-insight timer
    if (autoInsightEnabled) {
      startAutoInsightTimer();
    }
  } catch (error) {
    console.error("Error starting recording:", error);
    showError(error.message);
    btnStart.disabled = false;
    modelButtons.forEach((btn) => (btn.disabled = false));
  }
}

/**
 * Stop recording
 */
function stopRecording() {
  isRecording = false;

  if (audioProcessor) {
    audioProcessor.stop();
    audioProcessor = null;
  }

  // Tell worker to stop (clears pending audio)
  if (whisperWorker) {
    whisperWorker.postMessage({ type: "stop" });
  }

  // Stop auto-insight timer
  stopAutoInsightTimer();

  // Re-enable model selector
  modelButtons.forEach((btn) => (btn.disabled = false));

  // Update UI
  btnStart.innerHTML = `
    <span class="btn-content">
      <span class="play-icon">▶</span>
      <span>${t("start_translation")}</span>
    </span>
  `;
  btnStart.classList.remove("recording");
  recordingIndicator.classList.add("hidden");
}

/**
 * Initialize Whisper and Translation models
 */
async function initializeModels() {
  progressContainer.classList.remove("hidden");

  let whisperProgress = 0;
  let translatorProgress = 0;

  const updateProgress = () => {
    const totalProgress = (whisperProgress + translatorProgress) / 2;
    progressFill.style.width = `${totalProgress}%`;
    progressPercent.textContent = `${Math.round(totalProgress)}%`;
  };

  // Initialize Whisper worker
  await new Promise((resolve, reject) => {
    whisperWorker = new Worker(
      new URL("./whisper-worker.js", import.meta.url),
      { type: "module" }
    );

    whisperWorker.onmessage = async (event) => {
      const { type, data } = event.data;

      switch (type) {
        case "progress":
          if (data.progress !== undefined) {
            whisperProgress = data.progress;
            updateProgress();
          }
          break;

        case "ready":
          whisperProgress = 100;
          updateProgress();
          resolve();
          break;

        case "transcription":
          handleTranscription(data);
          break;

        case "error":
          console.error("Whisper error:", data);
          if (!modelsReady) {
            reject(new Error(data));
          }
          break;
      }
    };

    whisperWorker.onerror = (error) => {
      reject(error);
    };

    // Send init with selected model
    whisperWorker.postMessage({
      type: "init",
      data: { model: selectedModel },
    });
  });

  // Initialize translator
  await initializeTranslator((progress) => {
    if (progress.progress !== undefined) {
      translatorProgress = progress.progress;
      updateProgress();
    }
  });

  translatorProgress = 100;
  updateProgress();

  // Hide progress after a short delay
  setTimeout(() => {
    progressContainer.classList.add("hidden");
  }, 500);

  modelsReady = true;
}

/**
 * Handle transcription result
 * Shows original text immediately, then updates with translation asynchronously
 */
function handleTranscription(text) {
  if (!text || text.trim().length === 0) return;

  // Filter out common Whisper artifacts
  const cleanText = text
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .trim();

  if (cleanText.length === 0) return;

  // Add to transcript manager with placeholder translation
  transcriptManager.addEntry(cleanText, "");

  // Show original text IMMEDIATELY with loading indicator for translation
  const entryElement = addSubtitleEntry(cleanText, null);

  // Translate asynchronously — don't block the next transcription
  translateToSpanish(cleanText)
    .then((translation) => {
      // Update transcript entry with real translation
      const entries = transcriptManager.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry && lastEntry.original === cleanText) {
        lastEntry.translated = translation;
      }
      // Update the UI entry with the translation
      updateSubtitleTranslation(entryElement, translation);
    })
    .catch((error) => {
      console.error("Translation error:", error);
      updateSubtitleTranslation(entryElement, `[Error] ${cleanText}`);
    });

  // Check if we need to compress old transcript entries
  maybeCompressTranscript();
}

/**
 * Add a subtitle entry to the display
 * Returns the entry element for later updates
 */
function addSubtitleEntry(original, translated) {
  const entry = document.createElement("div");
  entry.className = "subtitle-entry";

  const relativeTime = transcriptManager.getRelativeTime();

  const translationHtml =
    translated !== null
      ? escapeHtml(translated)
      : `<span class="translating-indicator">${t("translating")}<span class="loading-dots"></span></span>`;

  entry.innerHTML = `
    <div class="bubble-content">
      <div class="subtitle-col">
        <span class="label">Original:</span>
        <p class="text">${escapeHtml(original)}</p>
      </div>
      <div class="subtitle-divider"></div>
      <div class="subtitle-col">
        <span class="label">Traducción:</span>
        <p class="text" data-translation-target>${translationHtml}</p>
      </div>
    </div>
    <div class="subtitle-timestamp">${relativeTime}</div>
  `;

  subtitlesContainer.appendChild(entry);
  subtitlesContainer.scrollTop = subtitlesContainer.scrollHeight;

  // Limit entries
  while (subtitlesContainer.children.length > 50) {
    subtitlesContainer.removeChild(subtitlesContainer.firstChild);
  }

  return entry;
}

/**
 * Update the translation text of an existing subtitle entry
 */
function updateSubtitleTranslation(entryElement, translation) {
  const translationDiv = entryElement.querySelector(
    "[data-translation-target]"
  );
  if (translationDiv) {
    translationDiv.innerHTML = escapeHtml(translation);
    // Add a subtle flash animation to signal the update
    translationDiv.classList.add("translation-updated");
    setTimeout(() => {
      translationDiv.classList.remove("translation-updated");
    }, 600);
  }
}

/**
 * Send chat message to AI
 */
async function sendChatMessage() {
  const question = chatInput.value.trim();
  if (!question || isChatLoading) return;

  // Clear input
  chatInput.value = "";

  // Clear empty state if present
  const chatEmpty = chatMessages.querySelector(".chat-empty");
  if (chatEmpty) {
    chatEmpty.remove();
  }

  // Show user message
  showChatMessage(question, "user");

  // Show loading state
  isChatLoading = true;
  btnSend.disabled = true;
  const loadingMsg = showChatMessage(t("translating"), "assistant loading");

  try {
    // Get smart transcript context (compressed summaries + recent entries)
    const context = transcriptManager.getSmartAIContext();

    // Ask AI
    const response = await askAboutTranscript(question, context);

    // Remove loading message
    loadingMsg.remove();

    // Show response
    showChatMessage(response, "assistant");
  } catch (error) {
    loadingMsg.remove();
    showChatMessage(`Error: ${error.message}`, "assistant");
  } finally {
    isChatLoading = false;
    btnSend.disabled = false;
  }
}

// ============================================
// Auto-Insight Functions
// ============================================

/**
 * Start the auto-insight periodic timer
 */
function startAutoInsightTimer() {
  stopAutoInsightTimer(); // Clear any existing timer
  console.log(`Auto-insights started: every ${autoInsightIntervalMs / 1000}s`);
  autoInsightTimer = setInterval(triggerAutoInsight, autoInsightIntervalMs);
}

/**
 * Stop the auto-insight timer
 */
function stopAutoInsightTimer() {
  if (autoInsightTimer) {
    clearInterval(autoInsightTimer);
    autoInsightTimer = null;
  }
}

/**
 * Trigger an auto-insight generation
 */
async function triggerAutoInsight() {
  if (!isRecording || isChatLoading) return;
  
  const recentContext = transcriptManager.getRecentContext(15);
  if (!recentContext || recentContext.trim().length === 0) return;

  try {
    const insight = await generateAutoInsight(recentContext);
    if (insight && insight.trim().length > 0) {
      showAutoInsightMessage(insight.trim());
    }
  } catch (error) {
    console.error("Auto-insight failed:", error);
  }
}

/**
 * Show an auto-insight message in the chat with special styling
 */
function showAutoInsightMessage(text) {
  // Clear empty state if present
  const chatEmpty = chatMessages.querySelector(".chat-empty");
  if (chatEmpty) {
    chatEmpty.remove();
  }

  const msg = document.createElement("div");
  msg.className = "chat-message auto-insight";
  msg.innerHTML = `
    <span class="auto-insight-badge">${t("auto_insight_badge")}</span>
    <span class="auto-insight-text">${escapeHtml(text)}</span>
  `;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

// ============================================
// Transcript Compression
// ============================================

/**
 * Check and trigger transcript compression if needed
 */
async function maybeCompressTranscript() {
  if (!transcriptManager.needsCompression()) return;

  const entriesToCompress = transcriptManager.getUncompressedEntries();
  if (entriesToCompress.length === 0) return;

  const fromIndex = transcriptManager.lastCompressedIndex;
  const toIndex = fromIndex + entriesToCompress.length;

  transcriptManager.startCompression();
  console.log(`Compressing entries ${fromIndex}-${toIndex}...`);

  try {
    const summary = await compressTranscriptBlock(entriesToCompress);
    if (summary && summary.trim().length > 0) {
      transcriptManager.addCompressedSummary(summary.trim(), fromIndex, toIndex);
    } else {
      // Compression returned empty — release the lock
      transcriptManager._compressionInProgress = false;
    }
  } catch (error) {
    console.error("Transcript compression failed:", error);
    transcriptManager._compressionInProgress = false;
  }
}

// ============================================
// Auto-Insight Preferences
// ============================================

/**
 * Load saved auto-insight preferences from localStorage
 */
function loadAutoInsightPrefs() {
  const savedEnabled = localStorage.getItem("auto_insight_enabled");
  if (savedEnabled !== null) {
    autoInsightEnabled = savedEnabled === "true";
    autoInsightToggle.checked = autoInsightEnabled;
  }

  const savedInterval = localStorage.getItem("auto_insight_interval");
  if (savedInterval) {
    autoInsightIntervalMs = parseInt(savedInterval, 10);
    autoInsightInterval.value = String(autoInsightIntervalMs);
  }
}

/**
 * Show a message in the chat
 */
function showChatMessage(text, type) {
  const msg = document.createElement("div");
  msg.className = `chat-message ${type}`;
  msg.textContent = text;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;

  subtitlesContainer.appendChild(errorDiv);
  emptyState.classList.add("hidden");

  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
