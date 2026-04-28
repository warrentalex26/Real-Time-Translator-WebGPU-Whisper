/**
 * Audio Capture Module
 * Handles microphone and tab audio capture using Web Audio API
 * Uses Voice Activity Detection (VAD) for intelligent chunking
 */

const SAMPLE_RATE = 16000; // Whisper requires 16kHz audio

// VAD Configuration
const VAD_THRESHOLD = 0.01; // RMS energy threshold to detect voice
const SILENCE_TIMEOUT_MS = 600; // ms of silence before considering end of speech
const MIN_CHUNK_DURATION = 1.5; // minimum seconds before sending a chunk
const MAX_CHUNK_DURATION = 12; // maximum seconds (safety cap)

/**
 * Get microphone audio stream
 * @returns {Promise<MediaStream>}
 */
export async function getMicrophoneStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: SAMPLE_RATE,
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });
    return stream;
  } catch (error) {
    if (error.name === "NotAllowedError") {
      throw new Error(
        "Permiso de micrófono denegado. Por favor, permite el acceso al micrófono."
      );
    }
    throw new Error(`Error al acceder al micrófono: ${error.message}`);
  }
}

/**
 * Get tab audio stream using screen sharing
 * @returns {Promise<MediaStream>}
 */
export async function getTabAudioStream() {
  try {
    // Request screen share with audio
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser", // Prefer browser tab
      },
      audio: {
        channelCount: 1,
        sampleRate: SAMPLE_RATE,
      },
      preferCurrentTab: false, // We want to select a different tab
      selfBrowserSurface: "exclude", // Don't show current tab
      systemAudio: "include", // Try to include system audio
    });

    // Check if audio track exists
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      // Stop video track if no audio
      stream.getTracks().forEach((track) => track.stop());
      throw new Error(
        'No se pudo capturar el audio. Asegúrate de seleccionar "Compartir audio de la pestaña".'
      );
    }

    // We don't need the video track, stop it to save resources
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => track.stop());

    // Create a new stream with only audio
    const audioStream = new MediaStream(audioTracks);
    return audioStream;
  } catch (error) {
    if (error.name === "NotAllowedError") {
      throw new Error(
        'Captura de pantalla cancelada. Selecciona una pestaña y marca "Compartir audio".'
      );
    }
    throw new Error(`Error al capturar audio de pestaña: ${error.message}`);
  }
}

/**
 * Calculate RMS (Root Mean Square) energy of audio samples
 * Used to detect voice activity
 * @param {Float32Array} samples - Audio samples
 * @returns {number} - RMS energy value
 */
function calculateRMS(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * Audio processor class with Voice Activity Detection (VAD)
 * Sends audio chunks based on speech patterns instead of fixed intervals
 */
export class AudioProcessor {
  constructor(onAudioChunk) {
    this.onAudioChunk = onAudioChunk;
    this.audioContext = null;
    this.mediaStreamSource = null;
    this.processor = null;
    this.audioBuffer = [];
    this.isProcessing = false;
    this.stream = null;

    // VAD state
    this.isSpeaking = false;
    this.silenceStart = null; // timestamp when silence began
    this.chunkStartTime = null; // timestamp when current chunk started accumulating
  }

  /**
   * Start processing audio from a stream
   * @param {MediaStream} stream
   */
  async start(stream) {
    this.stream = stream;
    this.isProcessing = true;
    this.audioBuffer = [];
    this.isSpeaking = false;
    this.silenceStart = null;
    this.chunkStartTime = null;

    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    });

    // Create source from stream
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

    // Create script processor for audio chunks
    // Note: ScriptProcessorNode is deprecated but worklet requires more setup
    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isProcessing) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const samples = new Float32Array(inputData);
      const rms = calculateRMS(samples);
      const now = Date.now();

      // Voice detected
      if (rms > VAD_THRESHOLD) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          if (!this.chunkStartTime) {
            this.chunkStartTime = now;
          }
        }
        this.silenceStart = null; // reset silence timer
        this.audioBuffer.push(samples);
      } else {
        // Silence detected
        if (this.isSpeaking) {
          // Still accumulate audio during brief silence (captures natural pauses)
          this.audioBuffer.push(samples);

          if (!this.silenceStart) {
            this.silenceStart = now;
          }

          const silenceDuration = now - this.silenceStart;
          const chunkDuration = this.chunkStartTime
            ? (now - this.chunkStartTime) / 1000
            : 0;

          // End of speech: silence exceeded threshold AND chunk is long enough
          if (
            silenceDuration >= SILENCE_TIMEOUT_MS &&
            chunkDuration >= MIN_CHUNK_DURATION
          ) {
            this.processChunk();
          }
        }
      }

      // Safety cap: force send if chunk is too long (someone speaking non-stop)
      if (this.chunkStartTime) {
        const chunkDuration = (now - this.chunkStartTime) / 1000;
        if (chunkDuration >= MAX_CHUNK_DURATION) {
          this.processChunk();
        }
      }
    };

    // Connect nodes
    this.mediaStreamSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    // Handle stream end
    stream.getTracks().forEach((track) => {
      track.onended = () => this.stop();
    });
  }

  /**
   * Process accumulated audio into a chunk and send it
   */
  processChunk() {
    if (this.audioBuffer.length === 0) return;

    // Concatenate all buffers
    const totalLength = this.audioBuffer.reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    const audioData = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of this.audioBuffer) {
      audioData.set(buffer, offset);
      offset += buffer.length;
    }

    // Reset state
    this.audioBuffer = [];
    this.isSpeaking = false;
    this.silenceStart = null;
    this.chunkStartTime = null;

    // Send chunk for processing
    if (this.onAudioChunk && this.isProcessing) {
      this.onAudioChunk(audioData);
    }
  }

  /**
   * Stop processing and clean up
   */
  stop() {
    this.isProcessing = false;

    // Process any remaining audio
    if (this.audioBuffer.length > 0) {
      this.processChunk();
    }

    // Disconnect nodes
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.audioBuffer = [];
    this.isSpeaking = false;
    this.silenceStart = null;
    this.chunkStartTime = null;
  }
}

