# Prompt Engineering Directive

> This file defines the Standard Operating Procedure (SOP) for prompt engineering tasks.

## The 3-Layer Architecture

**Layer 1: Directive (The Request)**
- Identify the user's need: "New Prompt," "Refine Prompt," or "Optimize Prompt."
- Classify the intent: Coding, Writing, Analysis, or Role-playing.

**Layer 2: Orchestration (Decision Making)**
- **Plan**: Determine the complexity. Simple tasks need simple prompts; complex tasks need frameworks.
- **Workflow**: Use the **@[.agent/workflows/prompt-expert.md]** workflow.
- **Skills**:
    - **@[.agent/skills/skills/prompt-library/SKILL.md]**: First, check for existing templates.
    - **@[.agent/skills/skills/prompt-engineer/SKILL.md]**: Use for structural refinement (RTF, RISEN).
    - **@[.agent/skills/skills/prompt-engineering-patterns/SKILL.md]**: Use for advanced optimization (CoT, Few-Shot).

**Layer 3: Execution (Doing the Work)**
- **Deterministic Tools**: Use `write_to_file` to save prompts or specific markdown blocks.
- **Validation**:
    - Ensure the prompt is in a markdown code block.
    - Verify that placeholders (e.g., `[INSERT TEXT]`) are clear.
    - Check for conciseness and clarity.

## Operating Principles

1.  **Structure Over Content**: A well-structured prompt usually beats a cleverly worded one. Use frameworks.
2.  **Iterative Refinement**: Don't settle for the first draft. Apply a "Cost & Efficiency Check" to remove fluff.
3.  **User-Centric**: The prompt must be easy for *the user* to use. Include instructions on how to fill in placeholders.
