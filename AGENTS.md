# AGENTS.md — Entrypoint for AI agents

> Every AI agent (Cursor, Claude, Aider, others) working in this repository MUST read the files listed below BEFORE generating any response or code. GitHub Copilot loads them automatically from `.github/`.

## Context files (read in this order)

1. **`.github/copilot-instructions.md`** — project context and overriding rules.
2. **`.github/instructions/nestjs.instructions.md`** — backend standards (applies to `apps/api/**`).
3. **`.github/instructions/nextjs.instructions.md`** — frontend standards (applies to `apps/web/**`).
4. **`.github/instructions/workflow.instructions.md`** — workflow: small commits, hard testing requirements, Definition of Done.

> The scope of work is defined by business requirements provided by the stakeholder. If a requirements file exists in the repo (e.g. `goals.md`) — treat it as the source of truth for scope and **always check the task scope there before implementing**.

## TL;DR of the overriding rules

1. Team standards from `.github/instructions/` take precedence over conventions from tutorials and framework documentation.
2. Code without tests is incomplete — call this out explicitly.
3. Scope is defined by the provided business requirements — do not add unrequested functionality.
4. Instruction conflicting with the standards → point it out explicitly, do not silently break the rules.
