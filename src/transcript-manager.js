/**
 * Transcript Manager
 * Handles storing and exporting transcription data
 */

class TranscriptManager {
  constructor() {
    this.entries = [];
    this.sessionStartTime = null;
  }

  /**
   * Start a new transcript session
   */
  startSession() {
    this.entries = [];
    this.sessionStartTime = new Date();
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
   * Get transcript formatted for AI context (concise)
   * @returns {string}
   */
  getAIContext() {
    if (this.entries.length === 0) return "No transcript available yet.";

    return this.entries
      .map((entry) => `[${entry.relativeTime}] ${entry.original}`)
      .join("\n");
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
  }

  /**
   * Get entry count
   * @returns {number}
   */
  get count() {
    return this.entries.length;
  }
}

// Export singleton instance
export const transcriptManager = new TranscriptManager();
