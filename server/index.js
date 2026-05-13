/**
 * Express Proxy Server for Notion API
 *
 * Provides a secure backend layer to interact with Notion
 * without exposing API secrets to the frontend.
 *
 * Routes:
 *   GET  /api/notion/health            — Status check
 *   GET  /api/notion/databases          — List accessible databases
 *   POST /api/notion/databases          — Create a new project database
 *   GET  /api/notion/databases/:id/categories — List categories in a database
 *   POST /api/notion/pages              — Create a new transcript page
 *   POST /api/notion/search             — Search across database(s)
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { NotionService } from "./notion.js";

dotenv.config();

const app = express();
const PORT = process.env.NOTION_PROXY_PORT || 3001;

// --- Middleware -----------------------------------------------------------

app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));

// Request logger
app.use((req, _res, next) => {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// --- Notion Service -------------------------------------------------------

const notionService = new NotionService({
  apiSecret: process.env.NOTION_API_SECRET,
  parentPageId: process.env.NOTION_PARENT_PAGE_ID,
});

// --- Routes ---------------------------------------------------------------

/**
 * Health check — verify the server and Notion connection are alive
 */
app.get("/api/notion/health", async (_req, res) => {
  try {
    const ok = await notionService.ping();
    res.json({ status: ok ? "ok" : "error", notion: ok });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * List all project databases under the parent page
 */
app.get("/api/notion/databases", async (_req, res) => {
  try {
    const databases = await notionService.listDatabases();
    res.json({ databases });
  } catch (error) {
    console.error("GET /databases error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new project database (e.g. "WS", "Andertons")
 * Body: { name: string }
 */
app.post("/api/notion/databases", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Database name is required." });
    }
    const database = await notionService.createProjectDatabase(name.trim());
    res.status(201).json({ database });
  } catch (error) {
    console.error("POST /databases error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List categories (select options) for a specific database
 */
app.get("/api/notion/databases/:id/categories", async (req, res) => {
  try {
    const categories = await notionService.getCategories(req.params.id);
    res.json({ categories });
  } catch (error) {
    console.error("GET /categories error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Save a transcript page to a database
 * Body: { databaseId, title, category, tags[], date, duration, entries, content, summary }
 */
app.post("/api/notion/pages", async (req, res) => {
  try {
    const {
      databaseId,
      title,
      category,
      tags,
      date,
      duration,
      entries,
      content,
      summary,
    } = req.body;

    if (!databaseId || !title) {
      return res
        .status(400)
        .json({ error: "databaseId and title are required." });
    }

    const page = await notionService.createTranscriptPage({
      databaseId,
      title,
      category: category || "Other",
      tags: tags || [],
      date: date || new Date().toISOString(),
      duration: duration || "00:00",
      entries: entries || 0,
      content: content || "",
      summary: summary || "",
    });

    res.status(201).json({ page });
  } catch (error) {
    console.error("POST /pages error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search transcript pages across one or all databases
 * Body: { query: string, databaseId?: string }
 */
app.post("/api/notion/search", async (req, res) => {
  try {
    const { query, databaseId } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const results = await notionService.searchTranscripts(
      query.trim(),
      databaseId
    );
    res.json({ results });
  } catch (error) {
    console.error("POST /search error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Global Error Handler -------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// --- Start ----------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n🚀 Notion proxy server running on http://localhost:${PORT}`);
  console.log(
    `   Parent page: ${process.env.NOTION_PARENT_PAGE_ID || "(not set)"}\n`
  );
});
