/**
 * Notion Service Layer
 *
 * Handles all interactions with the Notion API.
 * Follows the repository/service pattern — framework-agnostic business logic.
 */

import { Client } from "@notionhq/client";

/** Default categories pre-populated on every new project database */
const DEFAULT_CATEGORIES = [
  "Daily",
  "Refinement",
  "Planning",
  "Retro",
  "Other",
];

/**
 * Splits a long string into chunks that fit within Notion's 2000-char rich-text limit.
 * @param {string} text
 * @param {number} limit
 * @returns {Array<{type: string, text: {content: string}}>}
 */
function splitIntoRichTextBlocks(text, limit = 2000) {
  const blocks = [];
  let remaining = text;

  while (remaining.length > 0) {
    blocks.push({
      type: "text",
      text: { content: remaining.slice(0, limit) },
    });
    remaining = remaining.slice(limit);
  }

  return blocks;
}

/**
 * Converts a long string into Notion paragraph blocks
 * (each block has a 2000-char rich-text array limit).
 * @param {string} text
 * @returns {Array}
 */
function textToParagraphBlocks(text) {
  if (!text) return [];

  // Split on double newlines to make natural paragraphs
  const paragraphs = text.split(/\n{2,}/);
  const blocks = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: splitIntoRichTextBlocks(trimmed),
      },
    });
  }

  return blocks;
}

export class NotionService {
  /**
   * @param {Object} config
   * @param {string} config.apiSecret  — Notion internal integration token
   * @param {string} config.parentPageId — ID of the parent "Reuniones" page
   */
  constructor({ apiSecret, parentPageId }) {
    if (!apiSecret) {
      throw new Error("NOTION_API_SECRET is required. Check your .env file.");
    }
    if (!parentPageId) {
      throw new Error(
        "NOTION_PARENT_PAGE_ID is required. Check your .env file."
      );
    }

    this.client = new Client({ auth: apiSecret });
    this.parentPageId = parentPageId;
  }

  // ------------------------------------------------------------------
  // Health
  // ------------------------------------------------------------------

  /** Ping the Notion API to verify connectivity */
  async ping() {
    try {
      await this.client.users.me({});
      return true;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------
  // Databases (Projects)
  // ------------------------------------------------------------------

  /**
   * List all databases that are children of the parent page.
   * Returns an array of { id, name }.
   */
  async listDatabases() {
    const response = await this.client.blocks.children.list({
      block_id: this.parentPageId,
      page_size: 100,
    });

    const databases = [];

    for (const block of response.results) {
      if (block.type === "child_database") {
        databases.push({
          id: block.id,
          name: block.child_database.title,
        });
      }
    }

    return databases;
  }

  /**
   * Create a new project database under the parent page.
   * Pre-populates it with the standard schema and default categories.
   *
   * @param {string} name — Project name (e.g. "WS", "Andertons")
   * @returns {{ id: string, name: string }}
   */
  async createProjectDatabase(name) {
    const response = await this.client.databases.create({
      parent: { type: "page_id", page_id: this.parentPageId },
      title: [{ type: "text", text: { content: name } }],
      properties: {
        // Title column (required by Notion)
        Name: { title: {} },

        // Category — select with defaults
        Category: {
          select: {
            options: DEFAULT_CATEGORIES.map((cat) => ({
              name: cat,
            })),
          },
        },

        // Tags — multi-select (starts empty, grows organically)
        Tags: { multi_select: {} },

        // Date of the recording session
        Date: { date: {} },

        // Duration as plain text (e.g. "47:23")
        Duration: { rich_text: {} },

        // Number of transcript entries
        Entries: { number: {} },
      },
    });

    return { id: response.id, name };
  }

  /**
   * Retrieve the Category select options for a given database.
   * @param {string} databaseId
   * @returns {string[]}
   */
  async getCategories(databaseId) {
    try {
      const db = await this.client.databases.retrieve({
        database_id: databaseId,
      });

      const categoryProp = db.properties?.Category;
      if (!categoryProp || categoryProp.type !== "select") {
        return DEFAULT_CATEGORIES;
      }

      const options = categoryProp.select?.options || [];
      return options.length > 0
        ? options.map((opt) => opt.name)
        : DEFAULT_CATEGORIES;
    } catch (error) {
      console.warn("getCategories fallback:", error.message);
      return DEFAULT_CATEGORIES;
    }
  }

  // ------------------------------------------------------------------
  // Pages (Transcripts)
  // ------------------------------------------------------------------

  /**
   * Create a transcript page inside a project database.
   *
   * @param {Object} data
   * @param {string} data.databaseId
   * @param {string} data.title
   * @param {string} data.category
   * @param {string[]} data.tags
   * @param {string} data.date — ISO string
   * @param {string} data.duration — "MM:SS"
   * @param {number} data.entries
   * @param {string} data.content — Full bilingual transcript text
   * @param {string} data.summary — Short AI summary
   */
  async createTranscriptPage({
    databaseId,
    title,
    category,
    tags,
    date,
    duration,
    entries,
    content,
    summary,
  }) {
    // Build the page body (Notion content blocks)
    const children = [];

    // Header block
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "Summary" } }],
      },
    });

    // Summary paragraphs
    if (summary) {
      children.push(...textToParagraphBlocks(summary));
    }

    // Divider
    children.push({ object: "block", type: "divider", divider: {} });

    // Transcript header
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          { type: "text", text: { content: "Full Transcript" } },
        ],
      },
    });

    // Transcript content — split into paragraph blocks
    if (content) {
      children.push(...textToParagraphBlocks(content));
    }

    // Notion limits children to 100 blocks per request
    const limitedChildren = children.slice(0, 100);

    const response = await this.client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ type: "text", text: { content: title } }],
        },
        Category: {
          select: { name: category },
        },
        Tags: {
          multi_select: tags.map((tag) => ({ name: tag })),
        },
        Date: {
          date: { start: date.split("T")[0] },
        },
        Duration: {
          rich_text: [{ type: "text", text: { content: duration } }],
        },
        Entries: {
          number: entries,
        },
      },
      children: limitedChildren,
    });

    // If content exceeded 100 blocks, append the rest in batches
    if (children.length > 100) {
      const remaining = children.slice(100);
      const batches = [];
      for (let i = 0; i < remaining.length; i += 100) {
        batches.push(remaining.slice(i, i + 100));
      }
      for (const batch of batches) {
        await this.client.blocks.children.append({
          block_id: response.id,
          children: batch,
        });
      }
    }

    return {
      id: response.id,
      url: response.url,
      title,
    };
  }

  // ------------------------------------------------------------------
  // Search
  // ------------------------------------------------------------------

  /**
   * Search for transcript pages containing specific keywords.
   *
   * @param {string} query — Search keywords
   * @param {string} [databaseId] — Limit to a specific database (project).
   *                                 If omitted, searches all project databases.
   * @returns {Array<{ id, title, date, category, excerpt, databaseName }>}
   */
  async searchTranscripts(query, databaseId) {
    // If a specific database is given, search only there
    if (databaseId) {
      return this._searchInDatabase(query, databaseId);
    }

    // Otherwise search across all project databases
    const databases = await this.listDatabases();
    const allResults = await Promise.allSettled(
      databases.map((db) =>
        this._searchInDatabase(query, db.id).then((results) =>
          results.map((r) => ({ ...r, databaseName: db.name }))
        )
      )
    );

    return allResults
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);
  }

  /**
   * Search within a single database for pages matching the query.
   * Uses Notion's database query with title filter for each keyword,
   * then reads page content to find full-text matches.
   *
   * @param {string} query
   * @param {string} databaseId
   * @returns {Array}
   */
  async _searchInDatabase(query, databaseId) {
    // Use Notion's global search scoped to the database
    // Notion search API is limited — we query all pages then filter client-side
    const response = await this.client.databases.query({
      database_id: databaseId,
      page_size: 50,
      sorts: [{ property: "Date", direction: "descending" }],
    });

    const matchedPages = [];

    for (const page of response.results) {
      const titleParts = page.properties.Name?.title || [];
      const title = titleParts.map((t) => t.plain_text).join("");
      const date =
        page.properties.Date?.date?.start || "";
      const category =
        page.properties.Category?.select?.name || "";

      // Read the page content to do full-text matching
      const content = await this._getPageContent(page.id);
      const lowerContent = content.toLowerCase();
      const lowerQuery = query.toLowerCase();

      // Split query into words and check how many match
      const keywords = lowerQuery.split(/\s+/).filter((k) => k.length > 2);
      const matchCount = keywords.filter((kw) =>
        lowerContent.includes(kw)
      ).length;

      if (matchCount > 0) {
        // Extract a relevant excerpt around the first match
        const excerpt = this._extractExcerpt(content, keywords[0]);

        matchedPages.push({
          id: page.id,
          title,
          date,
          category,
          matchCount,
          excerpt,
          fullContent: content,
        });
      }
    }

    // Sort by match relevance
    matchedPages.sort((a, b) => b.matchCount - a.matchCount);

    return matchedPages;
  }

  /**
   * Read all text content from a page's blocks.
   * @param {string} pageId
   * @returns {string}
   */
  async _getPageContent(pageId) {
    const blocks = await this.client.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });

    const textParts = [];

    for (const block of blocks.results) {
      const richText =
        block[block.type]?.rich_text || block[block.type]?.text || [];
      if (Array.isArray(richText)) {
        const text = richText.map((rt) => rt.plain_text).join("");
        if (text) textParts.push(text);
      }
    }

    return textParts.join("\n");
  }

  /**
   * Extract a short excerpt around the first occurrence of a keyword.
   * @param {string} text
   * @param {string} keyword
   * @returns {string}
   */
  _extractExcerpt(text, keyword) {
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return text.slice(0, 200) + "...";

    const start = Math.max(0, idx - 80);
    const end = Math.min(text.length, idx + keyword.length + 120);
    let excerpt = text.slice(start, end);

    if (start > 0) excerpt = "..." + excerpt;
    if (end < text.length) excerpt = excerpt + "...";

    return excerpt;
  }
}
