# Artifact Schema

Get The Plan writes artifacts under `.plans/<slug>/`.

## `state.json`

```json
{
  "slug": "feature-slug",
  "mode": "quick|deep|agent|review",
  "status": "draft|reviewed|approved|blocked|in_progress|complete",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "ambiguity": 0.2,
  "scores": {
    "clarity": 0,
    "testability": 0,
    "decomposition": 0,
    "riskControl": 0,
    "executionReadiness": 0
  },
  "artifacts": {
    "context": ".plans/<slug>/context.md",
    "brief": ".plans/<slug>/brief.md",
    "plan": ".plans/<slug>/plan.md",
    "tasks": ".plans/<slug>/tasks.md",
    "critique": ".plans/<slug>/critique.md",
    "handoff": ".plans/<slug>/handoff.md"
  },
  "openQuestions": [],
  "criticalFindings": []
}
```

## Task IDs

Use stable IDs:
- `T001`, `T002`, ...
- Add `[P]` after ID for parallelizable tasks.
- Add story labels such as `[US1]` only when a user story exists.

Example:

```markdown
- [ ] T004 [P] [US1] Add contract test in `tests/api/create-plan.test.ts`
```

## Finding IDs

Use stable IDs:
- `C001` clarity
- `T001` testability
- `D001` decomposition
- `R001` risk
- `E001` execution readiness

Do not reuse task IDs and finding IDs in the same table without a category column.
