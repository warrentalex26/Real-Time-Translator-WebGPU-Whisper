/**
 * SaveModal Component
 *
 * Glassmorphism modal displayed when the user stops a recording.
 * Auto-generates title and tags via AI, but everything is editable.
 *
 * All visible text is in English by default with data-i18n attributes
 * for the i18n system.
 */

import {
  fetchDatabases,
  createDatabase,
  fetchCategories,
  saveTranscript,
} from "../services/notion-client.js";
import { t, getLanguage } from "../i18n.js";

/** Default categories shown when creating a new project */
const DEFAULT_CATEGORIES = [
  "Daily",
  "Refinement",
  "Planning",
  "Retro",
  "Other",
];

/**
 * Render the modal HTML and inject it into the DOM.
 * @returns {{ show: Function, hide: Function }}
 */
export function createSaveModal() {
  // Remove existing modal if present
  const existing = document.getElementById("save-modal-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "save-modal-overlay";
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal-card glass-card" id="save-modal-card">
      <div class="modal-header">
        <h2>
          <span class="modal-icon">💾</span>
          <span data-i18n="save_recording">Save Recording</span>
        </h2>
        <button class="modal-close-btn" id="save-modal-close" aria-label="Close">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Recording Name -->
        <div class="modal-field">
          <label for="save-modal-name" data-i18n="recording_name">Recording Name</label>
          <div class="input-with-skeleton">
            <input
              type="text"
              id="save-modal-name"
              class="modal-input"
              placeholder="Generating title..."
              data-i18n-placeholder="generating_title_placeholder"
              autocomplete="off"
            />
            <div class="skeleton-pulse hidden" id="save-modal-name-skeleton"></div>
          </div>
        </div>

        <!-- Project & Category -->
        <div class="modal-row">
          <div class="modal-field modal-field-half">
            <label for="save-modal-project" data-i18n="project_label">Project</label>
            <div class="select-with-action">
              <select id="save-modal-project" class="modal-select">
                <option value="" data-i18n="loading_projects">Loading projects...</option>
              </select>
              <button class="modal-add-btn" id="save-modal-add-project" title="New project" data-i18n="new_project_tooltip">+</button>
            </div>
          </div>
          <div class="modal-field modal-field-half">
            <label for="save-modal-category" data-i18n="category_label">Category</label>
            <select id="save-modal-category" class="modal-select">
              ${DEFAULT_CATEGORIES.map(
                (c) => `<option value="${c}">${c}</option>`
              ).join("")}
            </select>
          </div>
        </div>

        <!-- Tags -->
        <div class="modal-field">
          <label data-i18n="tags_label">Tags</label>
          <div class="tags-container" id="save-modal-tags">
            <div class="skeleton-pulse small hidden" id="save-modal-tags-skeleton"></div>
          </div>
          <div class="tag-input-row">
            <input
              type="text"
              id="save-modal-tag-input"
              class="modal-input tag-input"
              placeholder="Add tag..."
              data-i18n-placeholder="add_tag_placeholder"
              autocomplete="off"
            />
            <button class="modal-add-btn" id="save-modal-add-tag" title="Add tag">+</button>
          </div>
        </div>

        <!-- Session Stats -->
        <div class="modal-stats">
          <div class="stat-item">
            <span class="stat-icon">⏱️</span>
            <span class="stat-value" id="save-modal-duration">--:--</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">📝</span>
            <span class="stat-value" id="save-modal-entries">0</span>
            <span class="stat-label" data-i18n="entries_label">entries</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">📅</span>
            <span class="stat-value" id="save-modal-date">--</span>
          </div>
        </div>

        <!-- Status message -->
        <div class="modal-status hidden" id="save-modal-status">
          <span class="status-icon"></span>
          <span class="status-text"></span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn primary" id="save-modal-save" disabled>
          <span class="btn-icon">💾</span>
          <span data-i18n="save_to_notion">Save to Notion</span>
        </button>
        <button class="modal-btn secondary" id="save-modal-download">
          <span class="btn-icon">📥</span>
          <span data-i18n="download_txt">Download TXT</span>
        </button>
        <button class="modal-btn ghost" id="save-modal-cancel" data-i18n="cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // --- State ---------------------------------------------------------------

  let databases = [];
  let tags = [];
  let isLoading = false;

  // --- DOM refs ---
  const card = overlay.querySelector("#save-modal-card");
  const nameInput = overlay.querySelector("#save-modal-name");
  const nameSkeleton = overlay.querySelector("#save-modal-name-skeleton");
  const projectSelect = overlay.querySelector("#save-modal-project");
  const addProjectBtn = overlay.querySelector("#save-modal-add-project");
  const categorySelect = overlay.querySelector("#save-modal-category");
  const tagsContainer = overlay.querySelector("#save-modal-tags");
  const tagsSkeleton = overlay.querySelector("#save-modal-tags-skeleton");
  const tagInput = overlay.querySelector("#save-modal-tag-input");
  const addTagBtn = overlay.querySelector("#save-modal-add-tag");
  const durationEl = overlay.querySelector("#save-modal-duration");
  const entriesEl = overlay.querySelector("#save-modal-entries");
  const dateEl = overlay.querySelector("#save-modal-date");
  const statusEl = overlay.querySelector("#save-modal-status");
  const saveBtn = overlay.querySelector("#save-modal-save");
  const downloadBtn = overlay.querySelector("#save-modal-download");
  const cancelBtn = overlay.querySelector("#save-modal-cancel");
  const closeBtn = overlay.querySelector("#save-modal-close");

  // --- Event handlers -------------------------------------------------------

  closeBtn.addEventListener("click", hide);
  cancelBtn.addEventListener("click", hide);
  // Prevent accidental closing on outside click
  // overlay.addEventListener("click", (e) => {
  //   if (e.target === overlay) hide();
  // });

  addProjectBtn.addEventListener("click", handleAddProject);
  addTagBtn.addEventListener("click", handleAddTag);
  tagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  });

  projectSelect.addEventListener("change", handleProjectChange);

  // --- Internal functions ---------------------------------------------------

  function renderTags() {
    tagsContainer.innerHTML = tags
      .map(
        (tag) => `
      <span class="tag-chip">
        <span class="tag-text">${escapeHtml(tag)}</span>
        <button class="tag-remove" data-tag="${escapeHtml(tag)}">&times;</button>
      </span>
    `
      )
      .join("");

    // Attach remove handlers
    tagsContainer.querySelectorAll(".tag-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        tags = tags.filter((t) => t !== btn.dataset.tag);
        renderTags();
      });
    });
  }

  function handleAddTag() {
    const value = tagInput.value.trim().toLowerCase().replace(/\s+/g, "-");
    if (value && !tags.includes(value)) {
      tags.push(value);
      renderTags();
    }
    tagInput.value = "";
    tagInput.focus();
  }

  async function handleAddProject() {
    const name = prompt(t("new_project_prompt"));
    if (!name || name.trim().length === 0) return;

    try {
      setStatus("loading", t("creating_project"));
      const db = await createDatabase(name.trim());
      databases.push(db);
      populateProjects(db.id);
      setStatus("success", t("project_created"));
      setTimeout(() => clearStatus(), 2000);
    } catch (error) {
      setStatus("error", error.message);
    }
  }

  async function handleProjectChange() {
    const dbId = projectSelect.value;
    if (!dbId) return;

    // Remember last selection
    localStorage.setItem("notion_last_project", dbId);

    try {
      const categories = await fetchCategories(dbId);
      populateCategories(categories);
    } catch {
      populateCategories(DEFAULT_CATEGORIES);
    }
  }

  function populateProjects(selectId) {
    projectSelect.innerHTML = databases
      .map(
        (db) =>
          `<option value="${db.id}" ${db.id === selectId ? "selected" : ""}>${escapeHtml(db.name)}</option>`
      )
      .join("");

    if (databases.length === 0) {
      projectSelect.innerHTML = `<option value="" data-i18n="no_projects">No projects yet</option>`;
    }
  }

  function populateCategories(categories) {
    const lastCategory =
      localStorage.getItem("notion_last_category") || "Daily";
    categorySelect.innerHTML = categories
      .map(
        (cat) =>
          `<option value="${cat}" ${cat === lastCategory ? "selected" : ""}>${cat}</option>`
      )
      .join("");
  }

  function setStatus(type, message) {
    statusEl.classList.remove("hidden");
    const icon = statusEl.querySelector(".status-icon");
    const text = statusEl.querySelector(".status-text");

    statusEl.className = `modal-status ${type}`;
    icon.textContent =
      type === "loading" ? "⏳" : type === "success" ? "✅" : "❌";
    text.textContent = message;
  }

  function clearStatus() {
    statusEl.classList.add("hidden");
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Public API -----------------------------------------------------------

  /**
   * Show the modal and populate it with data.
   *
   * @param {Object} options
   * @param {Object} options.transcriptManager — The transcript manager instance
   * @param {Function} options.onDownload — Callback for the download button
   * @param {Function} [options.generateTitleAndTags] — AI function that returns { title, tags }
   */
  async function show({ transcriptManager, onDownload, generateTitleAndTags }) {
    overlay.classList.add("visible");
    document.body.style.overflow = "hidden";

    // Reset state
    tags = [];
    isLoading = false;
    clearStatus();
    nameInput.value = "";
    saveBtn.disabled = false;

    // Populate stats
    const duration = transcriptManager.getRelativeTime();
    const entryCount = transcriptManager.count;
    const now = new Date();
    durationEl.textContent = duration;
    entriesEl.textContent = String(entryCount);
    dateEl.textContent = now.toLocaleDateString(getLanguage(), {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Load databases in parallel with AI title generation
    nameSkeleton.classList.remove("hidden");
    tagsSkeleton.classList.remove("hidden");

    const [dbList] = await Promise.allSettled([
      fetchDatabases().catch(() => []),
    ]);

    databases = dbList.status === "fulfilled" ? dbList.value : [];
    const lastProject = localStorage.getItem("notion_last_project");
    populateProjects(lastProject || databases[0]?.id);

    // Load categories for selected project
    if (projectSelect.value) {
      try {
        const cats = await fetchCategories(projectSelect.value);
        populateCategories(cats);
      } catch {
        populateCategories(DEFAULT_CATEGORIES);
      }
    }

    // AI-generate title and tags
    if (generateTitleAndTags) {
      try {
        const { title, tags: suggestedTags } = await generateTitleAndTags();
        if (!nameInput.value) {
          nameInput.value = title || "";
        }
        if (suggestedTags?.length) {
          tags = [...new Set([...tags, ...suggestedTags])];
          renderTags();
        }
      } catch (error) {
        console.warn("AI title generation failed:", error);
        // Fallback title
        if (!nameInput.value) {
          nameInput.value = `Recording - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }
      }
    } else {
      nameInput.value = `Recording - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    nameSkeleton.classList.add("hidden");
    tagsSkeleton.classList.add("hidden");

    // Enable save button if we have databases
    saveBtn.disabled = databases.length === 0;

    // --- Save handler ---
    const handleSave = async () => {
      if (isLoading) return;
      isLoading = true;
      saveBtn.disabled = true;

      const title = nameInput.value.trim();
      if (!title) {
        setStatus("error", t("title_required"));
        isLoading = false;
        saveBtn.disabled = false;
        return;
      }

      const selectedDb = projectSelect.value;
      const selectedCategory = categorySelect.value;

      // Remember selections
      localStorage.setItem("notion_last_project", selectedDb);
      localStorage.setItem("notion_last_category", selectedCategory);

      setStatus("loading", t("saving_to_notion"));

      try {
        const content = transcriptManager.getPlainTextBilingual();
        const summaryContext = transcriptManager.getRecentContext(15);

        const page = await saveTranscript({
          databaseId: selectedDb,
          title,
          category: selectedCategory,
          tags,
          date: now.toISOString(),
          duration,
          entries: entryCount,
          content,
          summary: summaryContext
            ? `Auto-saved transcript with ${entryCount} entries over ${duration}.`
            : "",
        });

        setStatus("success", t("saved_successfully"));

        // Show link to Notion page
        if (page.url) {
          const statusText = statusEl.querySelector(".status-text");
          statusText.innerHTML = `${t("saved_successfully")} <a href="${page.url}" target="_blank" rel="noopener" class="notion-link">Open in Notion ↗</a>`;
        }

        setTimeout(() => hide(), 3000);
      } catch (error) {
        console.error("Save to Notion failed:", error);
        setStatus("error", `${t("save_failed")}: ${error.message}`);
        isLoading = false;
        saveBtn.disabled = false;
      }
    };

    // --- Download handler ---
    const handleDownload = () => {
      if (onDownload) onDownload();
    };

    // Clean up previous listeners
    saveBtn.replaceWith(saveBtn.cloneNode(true));
    downloadBtn.replaceWith(downloadBtn.cloneNode(true));

    // Re-query after replaceWith
    const newSaveBtn = overlay.querySelector("#save-modal-save");
    const newDownloadBtn = overlay.querySelector("#save-modal-download");
    newSaveBtn.addEventListener("click", handleSave);
    newDownloadBtn.addEventListener("click", handleDownload);

    // Focus the name input
    nameInput.focus();
    nameInput.select();
  }

  function hide() {
    overlay.classList.remove("visible");
    document.body.style.overflow = "";
  }

  return { show, hide };
}
