# Project Architecture: TraductorWebGPU

This document provides a high-level architectural overview of the TraductorWebGPU project. It is designed to help AI agents and developers quickly understand the system's components, data flow, and underlying technologies.

## 1. Project Overview

**TraductorWebGPU** is a real-time audio translation application that runs entirely in the browser. It captures audio from a microphone or browser tab, transcribes it from English to text, and translates the text into Spanish. It also includes an AI chat feature and a dedicated AI Summary generator that allows the user to deeply analyze the generated transcript.

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
2. **Buffering:** Audio is converted to 16kHz Float32Arrays and buffered into chunks (currently 4 seconds).
3. **Transcription:** Chunks are sent to a Web Worker running the Whisper model. The worker transcribes the audio to English text.
4. **Translation:** The English text is sent back to the main thread, displayed immediately (with a loading indicator for translation), and sent to the OPUS-MT model for Spanish translation.
5. **State & Display:** The `TranscriptManager` stores the bilingual entries. The UI updates dynamically.
6. **AI Features:** The user can ask questions in the chat panel, or trigger a "Detailed AI Summary" (🪄). The full transcript context is sent to Ollama (configured for 32k context on high-RAM systems like M4 Pro) or Gemini to generate responses or summaries in a new dedicated page (`pages/summary.html`).

## 4. Module Breakdown

### Core Modules (in `src/`)

- **`main.js`**: The central orchestrator. Handles DOM events, UI state, initializes models, and glues the capture, transcription, and translation modules together.
- **`audio-capture.js`**: Manages `getUserMedia` and `getDisplayMedia`. Implements an `AudioProcessor` that uses `AudioContext` and `ScriptProcessorNode` to downsample and buffer audio into 16kHz float arrays.
- **`whisper-worker.js`**: A dedicated Web Worker for transcription.
  - Loads the Whisper model via `transformers.js`.
  - Runs asynchronously to prevent blocking the main UI thread.
  - Receives audio chunks, processes them, and posts transcribed text strings back to `main.js`.
- **`translation.js`**: Runs the OPUS-MT (`Xenova/opus-mt-en-es`) model on the main thread. Includes a basic caching mechanism (`translationCache`) to avoid re-translating identical strings.
- **`transcript-manager.js`**: A state manager (`TranscriptManager` class) that holds the history of transcriptions. Handles formatting timestamps and exporting the transcript to a downloadable text file (Original or Bilingual).
- **`ai-chat.js`**: Manages interactions with AI providers. Formats prompts with the current transcript context to ask questions or generate detailed summaries using either a local Ollama instance (with extended context size) or the Gemini API.
- **`i18n.js`**: Handles localization for the UI elements (English/Spanish interface support).
- **`summary.js`**: Drives the logic for the dedicated AI Summary page (`pages/summary.html`), including markdown parsing, regeneration, and exporting to TXT/Word formats.

### Component Architecture (`src/components/`)
- **`Header.js` / `Footer.js`**: Reusable Vanilla JS components injected dynamically into both the main dashboard and the summary page to ensure a consistent, DRY UI layout across multiple views.

## 5. Key Architectural Decisions & Constraints

- **Web Workers for Whisper:** Whisper models are heavy. Running them on the main thread would freeze the UI. `whisper-worker.js` isolates this workload.
- **Audio Chunking Strategy:** Audio is captured in discrete chunks (e.g., 4 seconds) to balance latency with translation context. A stream that is too short lacks context; a stream that is too long delays the UI update.
- **Translation on Main Thread:** OPUS-MT is significantly lighter than Whisper. Currently, it runs on the main thread without causing severe blocking, though it could be moved to a worker if performance dictates.
- **Immediate Feedback UI:** When transcription finishes, the English text is rendered immediately, while the Spanish translation shows a loading state. This ensures the user feels the system is responsive.
- **Hardware-Aware AI Context:** The local Ollama implementation is configured to use a massive 32,768 context window (`num_ctx`). This allows users with high-RAM systems (like Apple Silicon M4 Pro with 24GB+ RAM) to process transcripts of entire long meetings without truncating context.
- **Vanilla JS Components:** To avoid the overhead of a large framework while still scaling the UI to multiple pages (like the summary page), the project uses dynamic DOM injection (`document.getElementById().innerHTML`) to share components like the Header and Footer.

## 6. Development & Run Instructions

- **Install:** `npm install`
- **Run Dev Server:** `npm run dev`
- **Build:** `npm run build`

*Note: For the application to function correctly, the browser must support WebGPU and Web Workers. The AI Chat's local mode requires Ollama to be running on `http://localhost:11434`.*

## 7. AI Agent Skills (MANDATORY)

> **⚠️ Any AI agent working on this project MUST check `.agents/skills/` at the start of each task and follow the relevant skill instructions before making changes.**

This project uses the [`npx skills`](https://skills.sh) system to manage project-local AI agent instructions. Skills are stored in `.agents/skills/` and tracked via `skills-lock.json` (similar to `package-lock.json`).

### Installed Skills

| Skill | Purpose |
|---|---|
| `english-html-i18n` | All HTML text must be in English by default; every visible string requires a `data-i18n` key registered in `src/i18n.js` with both `en` and `es` translations |
| `update-documentation` | After significant changes, verify and update `README.md` and `PROJECT_ARCHITECTURE.md`; skip for minor bug fixes |
| `accessibility` | WCAG 2.2 audit and improvements |
| `frontend-design` | Production-grade UI component standards |
| `modern-javascript-patterns` | ES6+ patterns, async/await, functional programming |
| `nodejs-backend-patterns` | Node.js service and API best practices |
| `nodejs-best-practices` | Framework selection, security, architecture decisions |
| `seo` | Meta tags, structured data, search optimization |
| `vite` | Vite config, plugins, and build optimization |

