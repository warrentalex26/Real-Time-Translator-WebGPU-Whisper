/**
 * Session Recovery Module
 *
 * Handles tab-close protection (beforeunload) and recovery of
 * interrupted recording sessions via a slide-in banner.
 */

import { transcriptManager, TranscriptManager } from "../transcript-manager.js";
import { t, getLanguage } from "../i18n.js";

// ============================================
// Tab Close Protection
// ============================================

/**
 * beforeunload handler — warns the user and forces a final auto-save.
 * Attach to `window` while recording; remove when recording stops.
 *
 * @param {Function} isRecordingFn - Returns true if recording is active
 */
export function createBeforeUnloadHandler(isRecordingFn) {
  return (e) => {
    if (isRecordingFn() && transcriptManager.count > 0) {
      transcriptManager.forceAutoSave();
      e.preventDefault();
      // Modern browsers ignore custom messages but require returnValue
      e.returnValue = "";
    }
  };
}

// ============================================
// Session Recovery Banner
// ============================================

/**
 * Check for a recoverable (interrupted) session and show the recovery banner.
 *
 * @param {Object} options
 * @param {Object} options.saveModal        — The SaveModal instance
 * @param {Function} options.onDownload     — Download callback for the SaveModal
 * @param {Function} options.generateTitleAndTags — AI title/tag generator
 */
export function checkForRecoverableSession({ saveModal, onDownload, generateTitleAndTags }) {
  const session = TranscriptManager.hasRecoverableSession();
  if (!session) return;

  const savedDate = new Date(session.savedAt);
  const dateStr = savedDate.toLocaleString(getLanguage(), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Build the recovery banner
  const banner = document.createElement("div");
  banner.className = "recovery-banner";
  banner.id = "recovery-banner";
  banner.innerHTML = `
    <div class="recovery-banner-inner">
      <span class="recovery-icon">⚠️</span>
      <div class="recovery-text">
        <div class="recovery-title" data-i18n="recovery_banner_title">${t("recovery_banner_title")}</div>
        <div class="recovery-message">${t("recovery_banner_message", { count: session.entries, date: dateStr })}</div>
      </div>
      <div class="recovery-actions">
        <button class="recovery-btn primary" id="recovery-restore-btn" data-i18n="recovery_restore">${t("recovery_restore")}</button>
        <button class="recovery-btn ghost" id="recovery-discard-btn" data-i18n="recovery_discard">${t("recovery_discard")}</button>
      </div>
    </div>
  `;

  document.body.prepend(banner);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.classList.add("visible");
    });
  });

  // Restore handler
  document.getElementById("recovery-restore-btn").addEventListener("click", () => {
    const recovered = transcriptManager.recoverSession();
    dismissRecoveryBanner(banner);

    if (recovered && saveModal) {
      saveModal.show({
        transcriptManager,
        onDownload,
        generateTitleAndTags,
        onSaveComplete: () => transcriptManager.clearAutoSave(),
        onDismiss: () => transcriptManager.clearAutoSave(),
      });
    }
  });

  // Discard handler
  document.getElementById("recovery-discard-btn").addEventListener("click", () => {
    transcriptManager.clearAutoSave();
    dismissRecoveryBanner(banner);
  });
}

/**
 * Animate out and remove the recovery banner
 */
function dismissRecoveryBanner(banner) {
  banner.classList.remove("visible");
  banner.addEventListener("transitionend", () => banner.remove(), { once: true });
  // Fallback if transition doesn't fire
  setTimeout(() => {
    if (banner.parentNode) banner.remove();
  }, 600);
}
