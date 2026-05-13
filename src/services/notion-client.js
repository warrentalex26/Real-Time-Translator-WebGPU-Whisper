/**
 * Notion Client — Frontend service
 *
 * Provides a clean API for the frontend to interact with the
 * Express proxy server. All Notion API calls go through the proxy
 * so the secret token is never exposed to the browser.
 */

const API_BASE = "/api/notion";

/**
 * Check if the Notion proxy server is reachable and connected.
 * @returns {Promise<boolean>}
 */
export async function checkNotionHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok" && data.notion === true;
  } catch {
    return false;
  }
}

/**
 * Fetch the list of project databases from Notion.
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function fetchDatabases() {
  const res = await fetch(`${API_BASE}/databases`);
  if (!res.ok) throw new Error("Failed to fetch databases");
  const data = await res.json();
  return data.databases;
}

/**
 * Create a new project database.
 * @param {string} name — Project name (e.g. "WS")
 * @returns {Promise<{id: string, name: string}>}
 */
export async function createDatabase(name) {
  const res = await fetch(`${API_BASE}/databases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create database");
  }
  const data = await res.json();
  return data.database;
}

/**
 * Fetch categories for a specific project database.
 * @param {string} databaseId
 * @returns {Promise<string[]>}
 */
export async function fetchCategories(databaseId) {
  const res = await fetch(`${API_BASE}/databases/${databaseId}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  const data = await res.json();
  return data.categories;
}

/**
 * Save a transcript page to Notion.
 *
 * @param {Object} payload
 * @param {string} payload.databaseId
 * @param {string} payload.title
 * @param {string} payload.category
 * @param {string[]} payload.tags
 * @param {string} payload.date    — ISO string
 * @param {string} payload.duration — "MM:SS"
 * @param {number} payload.entries
 * @param {string} payload.content — Bilingual transcript text
 * @param {string} payload.summary — Short AI summary
 * @returns {Promise<{id: string, url: string, title: string}>}
 */
export async function saveTranscript(payload) {
  const res = await fetch(`${API_BASE}/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save transcript");
  }
  const data = await res.json();
  return data.page;
}

/**
 * Search for transcripts matching a query.
 *
 * @param {string} query — Natural language query or keywords
 * @param {string} [databaseId] — Limit to a specific project. Omit for all.
 * @returns {Promise<Array<{id, title, date, category, matchCount, excerpt, fullContent, databaseName?}>>}
 */
export async function searchTranscripts(query, databaseId) {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, databaseId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Search failed");
  }
  const data = await res.json();
  return data.results;
}
