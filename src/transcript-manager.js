/**
 * Transcript Manager
 * Handles storing and exporting transcription data
 * Supports incremental compression for long meetings
 * Includes auto-save to localStorage for crash recovery
 */

// Compression thresholds
const COMPRESS_THRESHOLD = 30; // Compress every 30 new uncompressed entries
const RECENT_WINDOW = 40; // Keep last 40 entries in detail for AI context

// Auto-save configuration
const AUTOSAVE_KEY = "transcript_autosave";
const AUTOSAVE_DEBOUNCE_MS = 5000; // Save at most every 5 seconds

class TranscriptManager {
  constructor() {
    this.entries = [];
    this.sessionStartTime = null;
    this.compressedSummaries = []; // Array of { summary, fromIndex, toIndex, timestamp }
    this.lastCompressedIndex = 0; // Index up to which entries have been compressed
    this._compressionInProgress = false;
    this._autoSaveTimer = null;
  }

  /**
   * Start a new transcript session
   */
  startSession() {
    this.entries = [];
    this.sessionStartTime = new Date();
    this.compressedSummaries = [];
    this.lastCompressedIndex = 0;
    this._compressionInProgress = false;
    this._autoSaveTimer = null;
    this._saveAutoSaveSnapshot(); // Persist session start immediately
  }

  /**
   * Add an entry to the transcript
   * @param {string} original - Original English text
   * @param {string} translated - Spanish translation
   */
  addEntry(original, translated) {
    const entry = {
      timestamp: new Date(),
      relativeTime: this.getRelativeTime(),
      original: original,
      translated: translated,
    };
    this.entries.push(entry);
    this._scheduleAutoSave();
    return entry;
  }

  /**
   * Get relative time since session start
   * @returns {string} - Formatted time (MM:SS)
   */
  getRelativeTime() {
    if (!this.sessionStartTime) return "00:00";
    const elapsed = Math.floor(
      (Date.now() - this.sessionStartTime.getTime()) / 1000
    );
    const minutes = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (elapsed % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  /**
   * Get all entries
   * @returns {Array}
   */
  getEntries() {
    return this.entries;
  }

  /**
   * Get the full transcript as plain text (original language only)
   * @returns {string}
   */
  getPlainTextOriginal() {
    if (this.entries.length === 0) return "";

    const header = `Transcript - ${
      this.sessionStartTime?.toLocaleString() || "Unknown"
    }\n${"=".repeat(50)}\n\n`;

    const content = this.entries
      .map((entry) => `[${entry.relativeTime}] ${entry.original}`)
      .join("\n\n");

    return header + content;
  }

  /**
   * Get the full transcript as plain text (both languages)
   * @returns {string}
   */
  getPlainTextBilingual() {
    if (this.entries.length === 0) return "";

    const header = `Bilingual Transcript - ${
      this.sessionStartTime?.toLocaleString() || "Unknown"
    }\n${"=".repeat(50)}\n\n`;

    const content = this.entries
      .map(
        (entry) =>
          `[${entry.relativeTime}]\n🇺🇸 ${entry.original}\n🇪🇸 ${entry.translated}`
      )
      .join("\n\n---\n\n");

    return header + content;
  }

  /**
   * Get transcript formatted for AI context with smart compression
   * Returns compressed summaries + recent detailed entries
   * @returns {string}
   */
  getSmartAIContext() {
    if (this.entries.length === 0) return "No transcript available yet.";

    const parts = [];

    // Add compressed summaries as historical context
    if (this.compressedSummaries.length > 0) {
      parts.push("=== RESUMEN DE LO DISCUTIDO ANTERIORMENTE ===");
      this.compressedSummaries.forEach((block, i) => {
        parts.push(`[Bloque ${i + 1}] ${block.summary}`);
      });
      parts.push("=== FIN DEL RESUMEN ===\n");
    }

    // Add recent detailed entries
    const recentEntries = this.entries.slice(-RECENT_WINDOW);
    parts.push("=== TRANSCRIPCIÓN RECIENTE (DETALLADA) ===");
    recentEntries.forEach((entry) => {
      parts.push(`[${entry.relativeTime}] ${entry.original}`);
    });

    return parts.join("\n");
  }

  /**
   * Get original AI context (for backward compatibility)
   * @returns {string}
   */
  getAIContext() {
    return this.getSmartAIContext();
  }

  /**
   * Get only the most recent entries for lightweight operations (auto-insights)
   * @param {number} count - Number of recent entries to return
   * @returns {string}
   */
  getRecentContext(count = 15) {
    if (this.entries.length === 0) return "";
    const recent = this.entries.slice(-count);
    return recent
      .map((entry) => `[${entry.relativeTime}] ${entry.original}`)
      .join("\n");
  }

  /**
   * Check if there are enough uncompressed entries to trigger compression
   * @returns {boolean}
   */
  needsCompression() {
    if (this._compressionInProgress) return false;
    const uncompressedCount = this.entries.length - this.lastCompressedIndex;
    return uncompressedCount >= COMPRESS_THRESHOLD + RECENT_WINDOW;
  }

  /**
   * Get the entries that need to be compressed
   * @returns {Array}
   */
  getUncompressedEntries() {
    // Leave RECENT_WINDOW entries uncompressed (they go as detailed context)
    const endIndex = this.entries.length - RECENT_WINDOW;
    if (endIndex <= this.lastCompressedIndex) return [];
    return this.entries.slice(this.lastCompressedIndex, endIndex);
  }

  /**
   * Store a compressed summary for a block of entries
   * @param {string} summary - The AI-generated summary
   * @param {number} fromIndex - Start index of compressed entries
   * @param {number} toIndex - End index of compressed entries
   */
  addCompressedSummary(summary, fromIndex, toIndex) {
    this.compressedSummaries.push({
      summary,
      fromIndex,
      toIndex,
      timestamp: new Date(),
    });
    this.lastCompressedIndex = toIndex;
    this._compressionInProgress = false;
    console.log(
      `Compressed entries ${fromIndex}-${toIndex} into summary (${this.compressedSummaries.length} blocks total)`
    );
  }

  /**
   * Mark that compression is in progress (prevent duplicate compressions)
   */
  startCompression() {
    this._compressionInProgress = true;
  }

  /**
   * Export transcript as downloadable file
   * @param {string} format - 'original' or 'bilingual'
   */
  downloadAsFile(format = "original") {
    const content =
      format === "bilingual"
        ? this.getPlainTextBilingual()
        : this.getPlainTextOriginal();

    if (!content) {
      console.warn("No transcript to download");
      return;
    }

    const filename = `transcript_${this.formatDateForFilename()}.txt`;

    // Try using data URI (more compatible with some browsers)
    try {
      const dataUri =
        "data:text/plain;charset=utf-8," + encodeURIComponent(content);
      const link = document.createElement("a");
      link.href = dataUri;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      // Fallback: open in new window
      console.warn("Download failed, opening in new window", error);
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write("<pre>" + content + "</pre>");
        newWindow.document.title = filename;
      }
    }
  }

  /**
   * Format date for filename
   * @returns {string}
   */
  formatDateForFilename() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  }

  /**
   * Clear the transcript
   */
  clear() {
    this.entries = [];
    this.sessionStartTime = null;
    this.compressedSummaries = [];
    this.lastCompressedIndex = 0;
    this._compressionInProgress = false;
    this.clearAutoSave();
  }

  /**
   * Get entry count
   * @returns {number}
   */
  get count() {
    return this.entries.length;
  }

  // ============================================
  // Auto-Save & Recovery
  // ============================================

  /**
   * Schedule a debounced auto-save to localStorage.
   * Prevents writing on every single entry — batches within AUTOSAVE_DEBOUNCE_MS.
   */
  _scheduleAutoSave() {
    if (this._autoSaveTimer) return; // Already scheduled
    this._autoSaveTimer = setTimeout(() => {
      this._autoSaveTimer = null;
      this._saveAutoSaveSnapshot();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  /**
   * Immediately persist the current transcript state to localStorage.
   */
  _saveAutoSaveSnapshot() {
    try {
      const snapshot = {
        entries: this.entries.map((e) => ({
          timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
          relativeTime: e.relativeTime,
          original: e.original,
          translated: e.translated,
        })),
        sessionStartTime: this.sessionStartTime?.toISOString() ?? null,
        compressedSummaries: this.compressedSummaries,
        lastCompressedIndex: this.lastCompressedIndex,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("Auto-save failed:", error);
    }
  }

  /**
   * Force an immediate auto-save (e.g., on beforeunload).
   */
  forceAutoSave() {
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
    this._saveAutoSaveSnapshot();
  }

  /**
   * Clear the auto-save data from localStorage.
   * Called when the user stops recording normally.
   */
  clearAutoSave() {
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch (error) {
      console.warn("Failed to clear auto-save:", error);
    }
  }

  /**
   * Check if there is a recoverable session in localStorage.
   * @returns {{ entries: number, savedAt: string } | null}
   */
  static hasRecoverableSession() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      const snapshot = JSON.parse(raw);
      if (!snapshot.entries || snapshot.entries.length === 0) return null;
      return {
        entries: snapshot.entries.length,
        savedAt: snapshot.savedAt,
        sessionStartTime: snapshot.sessionStartTime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Recover a session from localStorage into this TranscriptManager instance.
   * @returns {boolean} true if recovery succeeded
   */
  recoverSession() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);

      this.entries = (snapshot.entries || []).map((e) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
      this.sessionStartTime = snapshot.sessionStartTime
        ? new Date(snapshot.sessionStartTime)
        : null;
      this.compressedSummaries = snapshot.compressedSummaries || [];
      this.lastCompressedIndex = snapshot.lastCompressedIndex || 0;
      this._compressionInProgress = false;

      return this.entries.length > 0;
    } catch (error) {
      console.error("Session recovery failed:", error);
      return false;
    }
  }
}
// Export singleton instance and class (class needed for static methods)
export const transcriptManager = new TranscriptManager();
export { TranscriptManager };
