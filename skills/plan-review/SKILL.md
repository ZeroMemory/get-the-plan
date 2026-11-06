---
name: plan-review
description: Critique, score, or validate a development plan, PRD, spec, task list, or execution handoff before implementation. Use when the user asks for review/grill/stress-test/readiness check or when get-the-plan creates a non-trivial plan.
---

# Plan Review

Review plans like a skeptical staff engineer. Findings first, then score, then remediation.

## Review Inputs

Prefer reviewing the complete artifact set under `.plans/<slug>/`:
- `brief.md`
- `context.md`
- `plan.md`
- `tasks.md`
- `handoff.md` when present

If only one file exists, review that file and flag missing artifacts as needed.

## Review Passes

1. **Requirement coverage**
   Every goal, requirement, success criterion, and non-goal should map to tasks or explicit exclusions.

2. **Ambiguity**
   Flag vague terms without measurable or observable checks.

3. **Task quality**
   Tasks must be small, ordered, independently verifiable, and tied to paths or discovery steps.

4. **Architecture and risk**
   Look for hidden coupling, migrations, public API breakage, data loss, security/privacy exposure, operational risk, and rollback gaps.

5. **Verification**
   Each meaningful task needs a test command, build/lint check, or manual validation.

6. **Execution fit**
   Check whether local execution, sequential subagents, or parallel lanes match the task shape.

## Severity

- `CRITICAL`: implementation should not start; missing core scope, unsafe action, no verification for high-risk work, conflicting requirements
- `HIGH`: likely rework or defects; oversized tasks, missing dependencies, vague acceptance criteria, unowned shared files
- `MEDIUM`: quality or maintainability risk; weak risk mitigation, incomplete edge cases, thin context
- `LOW`: wording, organization, small completeness improvements

## Output

For file-based review, write `.plans/<slug>/critique.md`.

Use this shape:

```markdown
# Plan Critique: <name>

## Verdict
<APPROVE | REVISE | BLOCK>

## Score
- Clarity: <0-100>
- Testability: <0-100>
- Decomposition: <0-100>
- Risk control: <0-100>
- Execution readiness: <0-100>

## Findings
| ID | Severity | Location | Issue | Fix |
|---|---|---|---|---|

## Coverage Gaps

## Remediation Plan

## Re-review Checklist
```

Do not approve a plan with critical findings. If no findings appear, run a second pass focused only on what is missing.
