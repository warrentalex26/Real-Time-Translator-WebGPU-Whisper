/**
 * Search Page Controller
 *
 * Handles the AI-powered search flow:
 * 1. Extract keywords from the natural language query via Gemini
 * 2. Search Notion for matching transcripts
 * 3. Pass found content + original question to Gemini for analysis
 * 4. Display the AI response with source references
 */

import { Header } from "./components/shared/Header.js";
import { Footer } from "./components/shared/Footer.js";
import { initI18n, t, getLanguage } from "./i18n.js";
import {
  fetchDatabases,
  searchTranscripts,
} from "./services/notion-client.js";
import { AI_CONFIG } from "./ai/config.js";

// --- Inject shared components ---
const appHeader = document.getElementById("app-header");
const appFooter = document.getElementById("app-footer");
if (appHeader) appHeader.innerHTML = Header();
if (appFooter) appFooter.innerHTML = Footer();

// --- DOM refs ---
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const projectSelect = document.getElementById("search-project");
const loadingEl = document.getElementById("search-loading");
const sourcesEl = document.getElementById("search-sources");
const sourcesList = document.getElementById("sources-list");
const sourceCount = document.getElementById("source-count");
const responseEl = document.getElementById("search-response");
const responseContent = document.getElementById("response-content");
const emptyEl = document.getElementById("search-empty");
const noResultsEl = document.getElementById("search-no-results");

// Loading step indicators
const stepKeywords = document.getElementById("step-keywords");
const stepSearching = document.getElementById("step-searching");
const stepAnalyzing = document.getElementById("step-analyzing");

// --- Init ---
document.addEventListener("DOMContentLoaded", init);

async function init() {
  initI18n();
  loadAIPrefs();
  await loadProjects();

  // Event listeners
  btnSearch.addEventListener("click", handleSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  });
}

/**
 * Load AI preferences from localStorage
 */
function loadAIPrefs() {
  const provider = localStorage.getItem("ai_provider") || "ollama";
  const ollamaModel = localStorage.getItem("ollama_model");

  if (provider === "gemini" || provider === "ollama") {
    AI_CONFIG.provider = provider;
  }
  // If Gemini key is available from .env, prefer it for the search page
  // (more reliable than assuming Ollama is running locally)
  if (AI_CONFIG.gemini.apiKey) {
    AI_CONFIG.provider = "gemini";
  }
  if (ollamaModel) AI_CONFIG.ollama.model = ollamaModel;
}

/**
 * Load available projects into the select dropdown
 */
async function loadProjects() {
  try {
    const databases = await fetchDatabases();
    const options = databases.map(
      (db) => `<option value="${db.id}">${escapeHtml(db.name)}</option>`
    );
    projectSelect.innerHTML = `
      <option value="" data-i18n="all_projects">${t("all_projects")}</option>
      ${options.join("")}
    `;
  } catch (error) {
    console.warn("Could not load projects:", error.message);
  }
}

/**
 * Main search handler — orchestrates the 3-step flow
 */
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  // Reset UI
  resetResults();
  showLoading(true);

  try {
    // Step 1: Extract keywords from the natural language query
    activateStep(stepKeywords);
    const keywords = await extractKeywords(query);
    completeStep(stepKeywords);

    // Step 2: Search Notion
    activateStep(stepSearching);
    const databaseId = projectSelect.value || undefined;
    const results = await searchTranscripts(keywords, databaseId);
    completeStep(stepSearching);

    if (results.length === 0) {
      showLoading(false);
      noResultsEl.classList.remove("hidden");
      return;
    }

    // Show sources
    displaySources(results);

    // Step 3: Pass transcript content to AI for analysis
    activateStep(stepAnalyzing);
    const aiResponse = await analyzeWithAI(query, results);
    completeStep(stepAnalyzing);

    showLoading(false);
    displayResponse(aiResponse);
  } catch (error) {
    console.error("Search error:", error);
    showLoading(false);
    displayResponse(
      `❌ ${t("search_error")}: ${error.message}`
    );
  }
}

/**
 * Extract search keywords from a natural language query using Gemini.
 * Falls back to simple word extraction if Gemini is unavailable.
 *
 * @param {string} query
 * @returns {string} — Keywords joined by spaces
 */
async function extractKeywords(query) {
  const prompt = `You are a search keyword extractor for meeting transcripts. Given a natural language question, extract 2-5 clean search keywords.

Rules:
- Return ONLY the keywords separated by spaces, nothing else
- CORRECT any spelling mistakes or typos in technical terms, proper nouns, and product names (e.g. "cloudlfare" → "cloudflare", "reactt" → "react")
- Include proper nouns, ticket numbers, feature names, people names
- Remove common filler words ("did", "about", "the", "when", "se", "hablo", "algo", "de", "que")
- If there's a ticket number (e.g., WSC-1313), keep it exactly as-is
- Keep technical terms intact and correctly spelled

Question: "${query}"

Keywords:`;

  try {
    let keywordsText = "";
    if (AI_CONFIG.provider === "ollama") {
      const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_CONFIG.ollama.model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          options: { temperature: 0.1 },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        keywordsText = data.message?.content || "";
      }
    } else {
      if (!AI_CONFIG.gemini.apiKey) return extractKeywordsFallback(query);
      const response = await fetch(
        `${AI_CONFIG.gemini.baseUrl}/models/${AI_CONFIG.gemini.model}:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        keywordsText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    }
    
    return keywordsText.trim() || extractKeywordsFallback(query);
  } catch {
    return extractKeywordsFallback(query);
  }
}

/**
 * Simple keyword extraction fallback (no AI needed)
 */
function extractKeywordsFallback(query) {
  const stopwords = new Set([
    "the", "a", "an", "is", "was", "were", "be", "been",
    "did", "does", "do", "about", "when", "where", "what",
    "who", "how", "which", "that", "this", "with", "from",
    "have", "has", "had", "are", "they", "them", "there",
    "se", "ha", "de", "del", "el", "la", "los", "las",
    "en", "que", "por", "para", "con", "como", "fue",
    "habló", "hablo", "dijo", "mencionó", "menciono",
  ]);

  return query
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w.toLowerCase()))
    .join(" ");
}

/**
 * Send the found transcripts + original question to Gemini for analysis.
 *
 * @param {string} question — Original user question
 * @param {Array} results — Search results with fullContent
 * @returns {string} — AI-generated answer
 */
async function analyzeWithAI(question, results) {
  // Build context — Gemini 2.5 Flash supports 1M tokens, so we can send much more
  const contextParts = results.slice(0, 5).map((r, i) => {
    // Send up to 50,000 chars per transcript to avoid cutting off relevant content
    const fullText = r.fullContent?.slice(0, 50000) || r.excerpt || "";
    const dbName = r.databaseName || "Unknown";
    // Include the excerpt (already centred around the keyword) as a hint
    const excerptHint = r.excerpt
      ? `\n[RELEVANT EXCERPT: ...${r.excerpt}...]`
      : "";
    return `--- Recording ${i + 1}: "${r.title}" (${dbName}, ${r.date}, ${r.category}) ---${excerptHint}\n${fullText}`;
  });

  const context = contextParts.join("\n\n");

  const prompt = `You are analyzing bilingual meeting transcripts (English + Spanish) to answer a user's question.
The transcripts contain lines prefixed with 🇺🇸 (English original) and 🇪🇸 (Spanish translation).

Transcripts:
${context}

USER QUESTION: "${question}"

INSTRUCTIONS:
- ALWAYS respond entirely in Spanish, regardless of the question language
- Answer specifically based on the transcript content above
- Prefer quoting the 🇪🇸 Spanish translation lines over the 🇺🇸 English originals
- Reference which recording contains the information (title and date)
- Include the timestamp (e.g., [14:46]) when referencing a specific moment
- If the topic is not in any transcript, say so clearly in Spanish
- Be concise but thorough`;

  try {
    let answerText = "";
    if (AI_CONFIG.provider === "ollama") {
      const response = await fetch(`${AI_CONFIG.ollama.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_CONFIG.ollama.model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          options: { temperature: 0.4, num_ctx: 8192 },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        answerText = data.message?.content || "";
      }
    } else {
      if (!AI_CONFIG.gemini.apiKey) return buildFallbackResponse(results);
      const response = await fetch(
        `${AI_CONFIG.gemini.baseUrl}/models/${AI_CONFIG.gemini.model}:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        answerText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    }
    
    return answerText.trim() || t("no_ai_response");
  } catch (error) {
    console.error("AI analysis failed:", error);
    return buildFallbackResponse(results);
  }
}

/**
 * Build a basic response when AI is not available
 */
function buildFallbackResponse(results) {
  if (results.length === 0) return t("no_results_found");

  const lines = results.map(
    (r) =>
      `• **${r.title}** (${r.date}): ${r.excerpt?.slice(0, 150) || "No excerpt available"}...`
  );

  return `${t("found_in_transcripts")}:\n\n${lines.join("\n\n")}`;
}

// --- UI helpers ---

function resetResults() {
  sourcesEl.classList.add("hidden");
  responseEl.classList.add("hidden");
  emptyEl.classList.add("hidden");
  noResultsEl.classList.add("hidden");
  sourcesList.innerHTML = "";
  responseContent.textContent = "";

  // Reset steps
  [stepKeywords, stepSearching, stepAnalyzing].forEach((step) => {
    step.className = "loading-step";
  });
}

function showLoading(show) {
  loadingEl.classList.toggle("hidden", !show);
}

function activateStep(stepEl) {
  stepEl.classList.add("active");
}

function completeStep(stepEl) {
  stepEl.classList.remove("active");
  stepEl.classList.add("done");
}

function displaySources(results) {
  sourcesEl.classList.remove("hidden");
  sourceCount.textContent = `(${results.length})`;

  sourcesList.innerHTML = results
    .slice(0, 8)
    .map(
      (r) => `
    <div class="source-card">
      <div class="source-meta">
        <span class="source-title">${escapeHtml(r.title)}</span>
        ${r.databaseName ? `<span class="source-project">${escapeHtml(r.databaseName)}</span>` : ""}
      </div>
      <div class="source-info">
        <span class="source-date">${r.date || ""}</span>
        <span class="source-category">${r.category || ""}</span>
        <span class="source-matches">${r.matchCount} ${r.matchCount === 1 ? "match" : "matches"}</span>
      </div>
    </div>
  `
    )
    .join("");
}

function displayResponse(text) {
  responseEl.classList.remove("hidden");
  // Basic markdown-like rendering (bold, line breaks)
  responseContent.innerHTML = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
