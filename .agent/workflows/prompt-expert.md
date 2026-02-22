---
description: Comprehensive Prompt Engineering & Optimization Workflow
---
# Prompt Expert Workflow

When the user asks to "create a prompt," "improve a prompt," or "optimize a prompt," follow this structured workflow to deliver high-quality results.

## 1. Needs Assessment & Discovery
- **Goal**: Understand if the user needs a *new* prompt, wants to *fix* an existing one, or needs a *library* template.
- **Action**:
    - If starting from scratch, check **@[.agent/skills/skills/prompt-library/SKILL.md]** first for existing templates (Coding, Writing, Analysis, etc.).
    - If the user has a draft, proceed to Refinement.

## 2. Structural Refinement (The "Engineer" Phase)
- **Goal**: Transform raw intent into a structured framework.
- **Action**: Invoke **@[.agent/skills/skills/prompt-engineer/SKILL.md]**.
    - This skill will automatically select frameworks like **RTF**, **RISEN**, or **Chain of Thought** based on valid intent.
    - **Key**: Do not just "rewrite" the prompt; *structure* it.

## 3. Advanced Optimization (The "Pattern" Phase)
- **Goal**: Apply advanced techniques for complex tasks (e.g., few-shot, reasoning).
- **Action**: Consult **@[.agent/skills/skills/prompt-engineering-patterns/SKILL.md]**.
    - **Few-Shot**: If the task requires specific output formats, suggest adding 2-3 examples.
    - **CoT**: For logic puzzles or code debugging, enforce "Step-by-Step" reasoning.

## 4. Cost & Efficiency Check
- **Goal**: Ensure the prompt isn't wastefully long.
- **Action**:
    - Remove unnecessary politeness ("Please", "I would like").
    - Consolidate instructions.
    - Use strict output formats (JSON/Markdown) to avoid conversational fluff.

## 5. Final Output Generation
- Present the final prompt in a clean `markdown` code block.
- Ask the user if they want to test it immediately or save it to their local library.
