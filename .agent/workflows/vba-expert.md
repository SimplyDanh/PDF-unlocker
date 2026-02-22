---
description: Automated Macro & Coding Expertise Orchestrator
---
# VBA/Macro Expert Workflow

When the user invokes this workflow (e.g., by asking for a "VBA Expert Review" or mentioning this file), follow these steps to provide a state-of-the-art solution:

## 1. Discovery & Audit
- Read the relevant VBA modules or logic.
- Invoke **@[.agent/skills/skills/code-reviewer/SKILL.md]** to perform a line-by-line audit.
- Focus specifically on:
  - Hardcoded range/sheet references.
  - "Magic strings" and untyped Variables.
  - Error handling gaps.

## 2. Structural Brainstorming
- If refactoring is requested, invoke **@[.agent/skills/skills/multi-agent-brainstorming/SKILL.md]** to stress-test the new architecture.
- **Skeptic Role:** Must focus on Excel-specific failure points (missing sheets, protected ranges, version compatibility).
- **Constraint Guardian:** Must focus on performance (disabling ScreenUpdating, using Arrays instead of Range loops).

## 3. Clean Code Guardrails
- Before suggesting final code, cross-reference with **@[.agent/skills/skills/clean-code/SKILL.md]**.
- Consult **@[.agent/skills/skills/vba-macro/SKILL.md]** for VBA-specific best practices, error handling, and performance optimizations.
- Ensure all new subs/functions have clear doc-comments and consistent naming.

## 4. Implementation & Verification
- Use `multi_replace_file_content` to batch edits.
- provide a walkthrough highlighting the **Logic Preservation** (confirming no existing features broke).
