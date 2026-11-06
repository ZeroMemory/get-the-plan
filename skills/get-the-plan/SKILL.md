---
name: get-the-plan
description: Create an execution-ready development plan before coding. Use when the user wants a plan, PRD, task breakdown, feature design, implementation strategy, agent handoff, or when a development request is broad, ambiguous, risky, multi-file, or likely to benefit from structured planning before edits.
---

# Get The Plan

Use this skill to turn a development request into a plan Codex can actually execute.
It combines repo scan, ambiguity reduction, spec writing, task slicing, plan critique,
and execution handoff. Keep this file lean; load references only when needed.

## Modes

Choose the smallest mode that fits the request.

| Mode | Use When | Output |
|---|---|---|
| `quick` | Scope is clear and low risk | `brief.md`, `plan.md`, `tasks.md` |
| `deep` | Vague, broad, high-risk, product-shaped, or architecture-shaped work | full artifact set |
| `agent` | Work should be delegated or parallelized | full artifact set plus `handoff.md` |
| `review` | User gives an existing plan/spec/tasks to critique | `critique.md` or inline findings |

Auto-select:
- Use `quick` for focused changes with clear acceptance criteria.
- Use `deep` when success, scope, non-goals, or constraints are unclear.
- Use `agent` when there are independent lanes or subagents are useful.
- Use `review` when the user asks to review, grill, validate, score, or stress-test a plan.

## Required Workflow

1. **Create or choose a slug.**
   Use a short kebab-case task name. Store artifacts under `.plans/<slug>/`.

2. **Scan before asking.**
   Run `node plugins/get-the-plan/scripts/repo-scan.js --json` from the repo root when a repository is present.
   Do not ask the user for codebase facts that can be discovered locally.

3. **Clarify only blockers.**
   If core ambiguity remains, use the `deep-plan-interview` skill. Ask one question at a time.
   Non-goals and decision boundaries are mandatory for `deep` and `agent` mode.

4. **Write artifacts from templates.**
   Use `../../assets/templates/` as the output shape:
   - `context.md`: evidence from repo scan, standards, references, inferred constraints
   - `brief.md`: goal, scope, non-goals, success criteria
   - `plan.md`: architecture/approach, steps, risks, verification
   - `tasks.md`: task list with IDs, dependencies, paths, and checks
   - `handoff.md`: execution lane, ownership, subagent prompts, review gates
   - `critique.md`: plan review findings and score

5. **Split work by value, not layers.**
   Prefer vertical slices. Each slice should leave the system working and testable.
   Read `../../references/task-splitting-patterns.md` when the plan needs decomposition.

6. **Run plan quality checks.**
   Run `node plugins/get-the-plan/scripts/planlint.js .plans/<slug> --json`.
   Fix critical and high findings before calling the plan ready.

7. **Run a critic pass.**
   Use the `plan-review` skill for non-trivial plans. A plan is not ready just because it is well formatted.

8. **Prepare execution handoff.**
   Use `execution-handoff` when implementation follows. The handoff must name:
   - local vs subagent vs parallel execution
   - file ownership
   - verification commands
   - review gates
   - stop conditions

## Plan Quality Gate

A plan is execution-ready only when:
- goal, scope, non-goals, and success criteria are explicit
- assumptions are labeled and either resolved or accepted with risk
- tasks have exact paths or clear discovery actions
- each task has acceptance criteria and verification
- dependencies and parallelizable work are marked
- risky work includes rollback or mitigation
- vague terms have metrics or concrete observable checks
- no placeholders remain

For the complete rubric, read `../../references/plan-quality-rubric.md`.

## Stop Rules

Stop and ask the user when:
- a business/product tradeoff cannot be inferred from code
- a destructive, irreversible, external-production, credentialed, or paid action is needed
- there are two or more viable architectures with materially different consequences
- planlint reports unresolved critical findings that require user judgment

## Output Style

Write artifacts in the user's language unless codebase conventions make English more useful.
Keep visible chat concise: summarize what was saved, the score, blockers, and next execution options.
