---
name: update-documentation
description: Automatically verifies and updates PROJECT_ARCHITECTURE.md and README.md if recent code changes warrant it.
---

# Update Documentation Skill

**When to use this skill:**
Use this skill at the end of a task or chat session, specifically when you have made meaningful changes to the codebase (such as adding new features, changing architecture, updating dependencies, or refactoring logic).

**Instructions:**
1. Review the changes made during the current conversation.
2. Check the existing contents of `README.md` and `PROJECT_ARCHITECTURE.md`.
3. Evaluate if the changes alter the project's high-level architecture, add significant features, or change how a user runs/interacts with the project.
4. If the changes are minor (e.g., bug fixes, UI tweaks), **do not** update the documentation. Avoid unnecessary bloat.
5. If the changes are significant, thoughtfully update the relevant sections of `README.md` and `PROJECT_ARCHITECTURE.md` to reflect the new state of the project.
6. Ensure that explanations are concise and that you are not repeating minor details. Focus on the "what" and "why" at an architectural and feature level.
