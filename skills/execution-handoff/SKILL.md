---
name: execution-handoff
description: Convert an approved development plan into an execution handoff for Codex local work or subagents. Use when a plan is ready and the next step is implementation, delegation, parallel agent work, verification, or phased execution.
---

# Execution Handoff

Use this after a plan passes review. The handoff tells Codex how to execute without rediscovering scope.

## Choose Execution Lane

| Lane | Use When |
|---|---|
| local | small, tightly coupled, next step is obvious |
| sequential subagents | tasks are clear but should be isolated and reviewed one by one |
| parallel subagents | tasks have disjoint file ownership and no shared blockers |
| review-only | user wants to keep planning separate from implementation |

## Required Handoff Content

Write `.plans/<slug>/handoff.md` with:
- approved plan path
- goal and stop condition
- task order
- file ownership
- disjoint write sets for parallel work
- verification commands
- spec compliance review instructions
- code quality review instructions
- escalation conditions
- completion evidence required

## Subagent Prompt Contract

Every implementation subagent prompt must include:
- exact task text
- files/modules it owns
- files/modules it must not touch
- relevant context excerpts
- acceptance criteria
- verification commands
- expected report format

Report statuses:
- `DONE`: complete and verified
- `DONE_WITH_CONCERNS`: complete but uncertain
- `NEEDS_CONTEXT`: blocked on missing information
- `BLOCKED`: cannot safely complete

## Review Gates

After each delegated task:
1. Inspect changed files.
2. Check task requirements against actual diff.
3. Run relevant verification.
4. Only then mark task complete.

For non-trivial tasks, use two reviews:
- spec compliance: did it build exactly what was requested?
- quality: is it maintainable, tested, and consistent with the codebase?

## Stop Conditions

Stop and return to the user if:
- task instructions contradict repo facts
- two agents need the same files
- verification fails and the cause is not localized
- a new architecture decision is required
- implementation would expand beyond approved scope
