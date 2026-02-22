# VBA Development Directive

> This file defines the Standard Operating Procedure (SOP) for VBA development tasks.

## The 3-Layer Architecture

**Layer 1: Directive (The Request)**
- Identify the user's goal (e.g., "Fix this macro," "Create a financial report").
- Reference `SKILL.md` in `.agent/skills/skills/vba-macro` for technical standards.

**Layer 2: Orchestration (Decision Making)**
- **Plan**: Always review existing code before writing new code.
- **Workflow**: Use the **@[.agent/workflows/vba-expert.md]** workflow.
- **Skills**:
    - **@[.agent/skills/skills/vba-macro/SKILL.md]**: For code generation and best practices.
    - **@[.agent/skills/skills/code-reviewer/SKILL.md]**: For auditing existing code.
    - **@[.agent/skills/skills/clean-code/SKILL.md]**: For final polish.

**Layer 3: Execution (Doing the Work)**
- **Deterministic Tools**: Use `write_to_file` or `multi_replace_file_content`.
- **Validation**:
    - Always use `Option Explicit`.
    - implementation error handling (`On Error GoTo`).
    - Verify code compilation (if possible) or visually inspect logic.

## Operating Principles

1.  **Safety First**: Never run a macro that deletes files without explicit user confirmation.
2.  **Performance**: Prioritize arrays over cell iterations. Disable `ScreenUpdating` during execution.
3.  **Self-Correction**: If a macro fails, read the error, analyze the logic, and fix it using the "Debug" capability of the vba-macro skill.
