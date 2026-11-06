---
name: deep-plan-interview
description: Clarify ambiguous development work before planning. Use when a request lacks success criteria, non-goals, decision boundaries, constraints, target users, priority, or enough codebase grounding to create an execution-ready plan.
---

# Deep Plan Interview

This is the clarification mode for Get The Plan. It turns vague intent into a brief that can feed planning.

## Principle

Ask the fewest questions that materially reduce rework risk. If an answer can be discovered from the repository, discover it first and ask only for confirmation or judgment.

## Clarity Dimensions

Score each dimension from `0.0` to `1.0` internally:
- intent: why this matters
- outcome: what the end state looks like
- scope: what is included
- non_goals: what must stay out
- constraints: technical, product, timeline, policy
- success: observable completion criteria
- context: repo and existing pattern grounding
- decision_boundaries: what Codex may decide alone

Use this ambiguity formula:

```text
ambiguity = 1 - (
  intent * 0.18 +
  outcome * 0.16 +
  scope * 0.16 +
  non_goals * 0.14 +
  constraints * 0.12 +
  success * 0.12 +
  context * 0.06 +
  decision_boundaries * 0.06
)
```

Targets:
- quick: `ambiguity <= 0.30`
- deep: `ambiguity <= 0.20`
- agent/high-risk: `ambiguity <= 0.15`

Do not hand off while `non_goals` or `decision_boundaries` are empty.

## Question Loop

For each round:
1. Update scores.
2. Pick the weakest material dimension.
3. Ask exactly one question.
4. Prefer a recommended answer when useful.
5. Pressure-test the answer with one of:
   - concrete example
   - counterexample
   - hidden assumption
   - boundary/tradeoff
   - measurable success signal
6. Stop when target ambiguity is met and mandatory gates are explicit.

## Useful Questions

Use these as patterns, not a script:

- What outcome would make this clearly worth doing?
- What is explicitly out of scope for the first pass?
- What may Codex decide without asking again?
- What must stay compatible with existing behavior?
- What would make you reject the implementation?
- Which user or workflow is the first priority?
- What is the smallest useful version?
- What risk are you most trying to avoid?

## Crystallized Brief

When done, write or update `.plans/<slug>/brief.md` with:
- goal
- users/workflows affected
- in scope
- non-goals
- success criteria
- constraints
- assumptions
- decision boundaries
- unresolved questions
- residual risk if proceeding above threshold

Then return to `get-the-plan`.
