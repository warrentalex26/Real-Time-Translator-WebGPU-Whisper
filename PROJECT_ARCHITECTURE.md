# Project Architecture: TraductorWebGPU

This document provides a high-level architectural overview of the TraductorWebGPU project. It is designed to help AI agents and developers quickly understand the system's components, data flow, and underlying technologies.

## 1. Project Overview

**TraductorWebGPU** is a real-time audio translation application that runs entirely in the browser. It captures audio from a microphone or browser tab, transcribes it from English to text, and translates the text into Spanish. It also includes an AI chat feature, a dedicated AI Summary generator, and a built-in LLM text translator for manual translations.

**Core Philosophy:** 100% Local execution (except for optional Gemini API integration) utilizing WebGPU for hardware-accelerated machine learning directly within the browser, ensuring low latency and privacy. It features a modern Glassmorphism UI built with reusable Vanilla JS components.

## 2. Technology Stack

- **Frontend:** Vanilla JavaScript, HTML5, SCSS (No heavy frameworks like React/Vue).
- **Build Tool:** Vite.
- **Machine Learning Engine:** `@huggingface/transformers` (Transformers.js).
- **Hardware Acceleration:** WebGPU (fallback to WASM if unsupported).
- **Models:**
  - Transcription: `onnx-community/whisper-tiny|base|small`
  - Translation: `Xenova/opus-mt-en-es`
- **Audio Capture:** Web Audio API (`navigator.mediaDevices`).
- **AI Chat:** Local Ollama (`llama3.2`) or remote Gemini API (`gemini-1.5-flash`).

## 3. System Architecture & Data Flow

The application follows an asynchronous, event-driven architecture, separating audio capture, transcription, translation, and UI updates.

### High-Level Data Flow:
1. **Capture:** Raw audio is captured via Microphone or System Audio (Screen Share).
2. **Buffering:** Audio is converted to 16kHz Float32Arrays and buffered intelligently using Voice Activity Detection (VAD). Instead of fixed intervals, audio is sent when a natural speech pause is detected (600ms silence threshold).
3. **Transcription:** Chunks are sent to a Web Worker running the Whisper model. The worker transcribes the audio to English text.
4. **Translation:** The English text is sent back to the main thread, displayed immediately (with a loading indicator for translation), and sent to the OPUS-MT model for Spanish translation.
5. **State & Display:** The `TranscriptManager` stores the bilingual entries. The UI updates dynamically.
6. **AI Features:** The user can ask questions in the chat panel, trigger a "Detailed AI Summary" (🪄), or use the **Translator Tab** in the Control Center to manually translate free-form text using Ollama or Gemini. A **Smart Context** system compresses older transcript blocks into summaries so that AI queries always fit within context limits, even for multi-hour meetings. **Auto-Insights** periodically generate automatic summaries of the current discussion topic at configurable intervals (1–10 min).

## 4. Module Breakdown

### Core Modules (in `src/`)

- **`main.js`**: The central orchestrator. Handles DOM events, UI state, initializes models, and glues the capture, transcription, and translation modules together.
- **`audio-capture.js`**: Manages `getUserMedia` and `getDisplayMedia`. Implements an `AudioProcessor` that uses `AudioContext` and `ScriptProcessorNode` to downsample and buffer audio into 16kHz float arrays.
- **`whisper-worker.js`**: A dedicated Web Worker for transcription.
  - Loads the Whisper model via `transformers.js`.
  - Runs asynchronously to prevent blocking the main UI thread.
  - Receives audio chunks, processes them, and posts transcribed text strings back to `main.js`.
- **`translation.js`**: Runs the OPUS-MT (`Xenova/opus-mt-en-es`) model on the main thread. Includes a basic caching mechanism (`translationCache`) to avoid re-translating identical strings.
- **`transcript-manager.js`**: A state manager (`TranscriptManager` class) that holds the history of transcriptions. Handles formatting timestamps and exporting the transcript to a downloadable text file (Original or Bilingual). Implements **incremental compression**: after every 30 new entries, older transcript blocks are summarized by the AI and stored as compressed summaries. `getSmartAIContext()` returns these summaries plus the last 40 detailed entries, keeping the AI context always within token limits.
- **`ai-chat.js`**: Thin orchestration facade for AI features. Re-exports config functions and routes calls to the appropriate provider module. Public API: `askAboutTranscript`, `askAboutTranscriptStreaming`, `compressTranscriptBlock`, `generateAutoInsight`, `generateSummary`.

### AI Modules (`src/ai/`)
- **`config.js`**: Centralized `AI_CONFIG` object and provider management (`setAIProvider`, `setGeminiApiKey`, `checkOllamaAvailable`).
- **`prompts.js`**: All system prompts — Q&A (`buildSystemPrompt`), compression, auto-insight, summary, and general text translation prompts. Single place to tune AI behavior.
- **`ollama.js`**: All Ollama API interactions — chat, streaming (NDJSON), compression, insights, translation, and summary generation.
- **`gemini.js`**: All Gemini API interactions — chat, streaming (SSE), compression, insights, translation, and summary generation.
- **`translator.js`**: Dedicated module for the free-form text translator tool in the Control Center. Routes translation requests (en->es or es->en) to the active AI provider.
- **`i18n.js`**: Handles localization for the UI elements (English/Spanish interface support).
- **`summary.js`**: Drives the logic for the dedicated AI Summary page (`pages/summary.html`), including markdown parsing, regeneration, and exporting to TXT/Word formats.

### Component Architecture (`src/components/`)
- **`Header.js` / `Footer.js`**: Reusable Vanilla JS components injected dynamically into both the main dashboard and the summary page to ensure a consistent, DRY UI layout across multiple views.

## 5. Key Architectural Decisions & Constraints

- **Web Workers for Whisper:** Whisper models are heavy. Running them on the main thread would freeze the UI. `whisper-worker.js` isolates this workload.
- **Audio Chunking Strategy:** Audio chunking uses energy-based Voice Activity Detection (VAD) instead of fixed time intervals. The `AudioProcessor` monitors RMS energy levels in real-time: when energy drops below the threshold for 600ms, the system considers it end-of-speech and sends the accumulated audio as a complete utterance. Safety bounds (min 1.5s, max 12s) prevent micro-fragments and excessively long chunks. This dramatically improves transcription and translation quality by sending complete sentences to Whisper.
- **Translation on Main Thread:** OPUS-MT is significantly lighter than Whisper. Currently, it runs on the main thread without causing severe blocking, though it could be moved to a worker if performance dictates.
- **Immediate Feedback UI:** When transcription finishes, the English text is rendered immediately, while the Spanish translation shows a loading state. This ensures the user feels the system is responsive.
- **Hardware-Aware AI Context:** The local Ollama implementation is configured to use a massive 32,768 context window (`num_ctx`). This allows users with high-RAM systems (like Apple Silicon M4 Pro with 24GB+ RAM) to process transcripts of entire long meetings without truncating context.
- **Vanilla JS Components:** To avoid the overhead of a large framework while still scaling the UI to multiple pages (like the summary page), the project uses dynamic DOM injection (`document.getElementById().innerHTML`) to share components like the Header and Footer.
- **Smart Context Compression:** For long meetings (30+ min), the full transcript can exceed the AI's context window. The system automatically compresses older blocks of 30 entries into short AI-generated summaries (~200 tokens each). When querying the AI, the context sent is always: `[compressed summaries] + [last 40 detailed entries]`, keeping it bounded while preserving full meeting history.
- **Auto-Insights:** A configurable periodic timer (1–10 min intervals) generates automatic descriptions of what's currently being discussed, using only the last 15 transcript entries for fast, lightweight AI calls.

## 6. Development & Run Instructions

- **Install:** `npm install`
- **Run Dev Server:** `npm run dev`
- **Build:** `npm run build`

*Note: For the application to function correctly, the browser must support WebGPU and Web Workers. The AI Chat's local mode requires Ollama to be running on `http://localhost:11434`.*

## 7. AI Agent Skills (MANDATORY)

> **⚠️ Any AI agent working on this project MUST follow the skill workflow below. Failure to do so will result in incorrect or incomplete work.**

This project uses the [`npx skills`](https://skills.sh) system to manage project-local AI agent instructions. Skills are stored in `.agents/skills/` and tracked via `skills-lock.json` (similar to `package-lock.json`).

### Mandatory Workflow

Every task that modifies code MUST follow this sequence:

#### 🔵 BEFORE making any code changes:
1. **Read `.agents/skills/english-html-i18n/SKILL.md`** — Ensure all HTML/JS-generated text is in English by default with `data-i18n` attributes. Register every new key in `src/i18n.js` with both `en` and `es` translations.
2. **Read any other relevant skill** for the task at hand (e.g., `frontend-design` for UI work, `vite` for build config, etc.).

#### 🟢 AFTER completing all code changes:
1. **Read `.agents/skills/update-documentation/SKILL.md`** — Evaluate if the changes warrant updates to `README.md` and/or `PROJECT_ARCHITECTURE.md`. Update if the change is a significant feature or architectural shift; skip for minor bug fixes or tweaks.

### Installed Skills

| Skill | When to Apply | Phase |
|---|---|---|
| `english-html-i18n` | Any time HTML or JS-generated UI is written or modified | **BEFORE** |
| `update-documentation` | After significant features or architecture changes | **AFTER** |
| `accessibility` | Auditing or improving a11y (WCAG 2.2) | Before |
| `frontend-design` | Building or redesigning UI components and pages | Before |
| `modern-javascript-patterns` | Refactoring or writing new JS modules | Before |
| `nodejs-backend-patterns` | Adding any Node.js server-side logic | Before |
| `nodejs-best-practices` | Architecture or framework decisions | Before |
| `seo` | Updating meta tags, page titles, or structured data | Before |
| `vite` | Modifying `vite.config.js` or build configuration | Before |

