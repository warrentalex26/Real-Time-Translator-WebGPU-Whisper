# 🎙️ Real-Time Translator | WebGPU Whisper

A **fully local, privacy-first** real-time audio translator that runs entirely in your browser. It captures audio (microphone or browser tab), transcribes it using **OpenAI Whisper** via WebGPU, and translates it from English to Spanish using **OPUS-MT** — all without sending a single byte to external servers.

![Real-Time Translator UI](https://img.shields.io/badge/Status-Active-brightgreen) ![WebGPU](https://img.shields.io/badge/WebGPU-Powered-blueviolet) ![Privacy](https://img.shields.io/badge/Privacy-100%25_Local-green)

## ✨ Features

- **🧠 Local Speech-to-Text** — Whisper models (tiny/base/small) running on WebGPU or WASM fallback
- **🌐 Local Translation** — OPUS-MT English→Spanish, no API calls needed
- **🎤 Dual Audio Sources** — Capture from microphone or browser tab audio
- **📝 Real-Time Subtitles** — Bilingual subtitles (English + Spanish) with timestamps
- **🤖 AI Meeting Assistant** — Ask questions about the transcript using Ollama (local) or Gemini API
- **💾 Export Transcripts** — Download bilingual transcripts as text files
- **⚡ Model Selector** — Choose between speed (tiny), balance (base), or accuracy (small)
- **🌍 Bilingual UI** — Application interface available in both English and Spanish
- **🔒 100% Private** — All audio processing happens locally in your browser

## 🏗️ Architecture

```
Audio Input → AudioProcessor (3s chunks) → Whisper Worker (WebGPU) → Translation (OPUS-MT) → UI
                                                                                    ↓
                                                                          AI Chat (Ollama/Gemini)
```
   
| Component | Technology | Runs On |
|-----------|-----------|---------|
| Speech Recognition | Whisper (tiny/base/small) via `@huggingface/transformers` | WebGPU / WASM |
| Translation | OPUS-MT (`Xenova/opus-mt-en-es`) | WebGPU / WASM |
| Audio Processing | Web Audio API (`ScriptProcessorNode`) | Browser |
| AI Chat | Ollama (local) or Gemini API | Local / Cloud |
| UI | Vanilla HTML/CSS/JS | Browser |
| Bundler | Vite | Node.js |

## 📦 Prerequisites

- **Node.js** 18+ (check `.nvmrc`)
- A **WebGPU-compatible browser** (Chrome 113+, Edge 113+). Falls back to WASM if unavailable.
- *(Optional)* [Ollama](https://ollama.ai) for local AI chat — install and run `ollama run llama3.2`
- *(Optional)* A [Gemini API key](https://aistudio.google.com/app/apikey) for cloud-based AI chat

## 🚀 Installation & Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/TraductorWebGPU.git
cd TraductorWebGPU

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

> **Note:** The first time you start a translation, the Whisper model (~74MB for base) will be downloaded and cached in your browser. Subsequent launches will load instantly from cache.

## 🎯 Usage

1. **Select audio source** — Choose between "Micrófono" (microphone) or "Audio de Pestaña" (browser tab audio)
2. **Choose a Whisper model:**
   - ⚡ **Rápido** (tiny, ~39MB) — Fastest, best for low-latency
   - ⚖️ **Balanceado** (base, ~74MB) — Good balance of speed and accuracy *(default)*
   - 🎯 **Preciso** (small, ~244MB) — Most accurate, slower
3. **Click "Iniciar Traducción"** — Models will download on first use, then recording begins
4. **Speak in English** — Real-time bilingual subtitles will appear (English original + Spanish translation)
5. **Ask the AI** — Use the chat panel to ask questions about the conversation (requires Ollama or Gemini API key)
6. **Download transcript** — Click the 💾 button to export a bilingual transcript

### AI Chat Setup

**Option A: Ollama (fully local, recommended)**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama run llama3.2
```

**Option B: Gemini API (cloud)**
1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. In the app, click "Gemini" in the AI provider toggle
3. Enter and save your API key (stored in localStorage, never sent anywhere except Google's API)

## 🔧 Build for Production

```bash
npm run build
npm run preview
```

Output will be in the `dist/` directory.

> **Important:** Your deployment must serve the following HTTP headers for WebGPU/ONNX Runtime to work:
> ```
> Cross-Origin-Opener-Policy: same-origin
> Cross-Origin-Embedder-Policy: require-corp
> ```

## 🔒 Privacy & Security

- **No data leaves your browser** — All speech recognition and translation runs locally via WebGPU/WASM
- **No hardcoded API keys** — Gemini API key is entered by the user at runtime and stored only in `localStorage`
- **No telemetry or tracking** — Zero external requests (except model downloads from Hugging Face on first use, and Gemini API calls if the user explicitly configures it)

## 📄 License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

You are free to use, share, and adapt this project for **non-commercial purposes** with attribution. Commercial use requires explicit permission from the author.
