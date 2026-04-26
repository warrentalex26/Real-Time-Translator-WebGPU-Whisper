---
name: english-html-i18n
description: Ensures all HTML is written with English text by default and properly utilizes the i18n translation system.
---

# English HTML & i18n Skill

**When to use this skill:**
Use this skill continuously when writing, modifying, or generating HTML files and UI components for the project.

**Instructions:**
1. **English by Default:** All hardcoded text strings inside HTML files (or JS files that generate HTML/UI) MUST be written in English. Do not write Spanish or other languages directly into the HTML source.
2. **Use i18n Attributes:** Whenever you add a new visible string, wrap it in an HTML tag and add a `data-i18n="translation_key"` attribute.
   - Example: `<button data-i18n="save_button">Save</button>`
   - For tooltips/titles: `title="Save"` and `data-i18n="save_tooltip"`
3. **Update Translation Files:** Whenever you introduce a new `data-i18n` key, you MUST immediately update the localization configuration (e.g., `src/i18n.js` or similar locale files). Add the English string under the `en` object and provide the appropriate translation under the `es` (Spanish) object.
4. **No Hardcoded Translations:** Never implement ad-hoc language switching logic. Always integrate with the existing `initI18n()` and `t()` system present in the project.
