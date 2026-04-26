/**
 * Audio Capture Module
 * Handles microphone and tab audio capture using Web Audio API
 */

const SAMPLE_RATE = 16000; // Whisper requires 16kHz audio
const CHUNK_DURATION = 4; // Process audio in 4-second chunks for lower latency

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
 * Audio processor class for handling real-time audio processing
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
  }

  /**
   * Start processing audio from a stream
   * @param {MediaStream} stream
   */
  async start(stream) {
    this.stream = stream;
    this.isProcessing = true;
    this.audioBuffer = [];

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
      // Copy the data since it will be reused
      this.audioBuffer.push(new Float32Array(inputData));

      // Check if we have enough data for a chunk
      const samplesPerChunk = SAMPLE_RATE * CHUNK_DURATION;
      const currentSamples = this.audioBuffer.reduce(
        (sum, arr) => sum + arr.length,
        0
      );

      if (currentSamples >= samplesPerChunk) {
        this.processChunk();
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
   * Process accumulated audio into a chunk
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

    // Clear buffer
    this.audioBuffer = [];

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
  }
}
