# Plan Quality Rubric

Use this rubric to judge whether a development plan is ready for execution.

## Required Sections

- Goal
- Current context and repo facts
- Scope
- Non-goals
- Success criteria
- Assumptions
- Risks and mitigations
- Implementation approach
- Task list
- Dependencies
- Verification
- Execution handoff

## Scoring

Score each category from 0 to 100.

### Clarity

High score:
- goal is one or more concrete outcomes
- scope boundaries are explicit
- non-goals are present
- assumptions are labeled
- unresolved questions are separated from facts

Low score:
- goal is only a feature name
- "improve", "better", "robust", "clean", or "fast" appear without criteria
- no user/workflow is named

### Testability

High score:
- acceptance criteria are observable
- tests or manual checks are listed
- verification commands are exact when discoverable
- expected outputs or pass conditions are stated

Low score:
- "test it" with no command or behavior
- success depends on subjective approval only
- no regression checks

### Decomposition

High score:
- tasks are independently understandable
- each task is small enough for a focused session
- vertical slices deliver value
- dependencies are explicit
- parallel tasks have disjoint write sets

Low score:
- tasks are horizontal layers only
- task names contain multiple unrelated "and" clauses
- tasks touch many unrelated files
- no ownership boundaries

### Risk Control

High score:
- migrations, auth, billing, security, public APIs, data loss, and destructive operations are flagged
- rollback or mitigation is named
- risky work is early when useful
- assumptions that could break the plan are visible

Low score:
- high-risk work appears as ordinary tasks
- rollback is absent
- security/privacy implications are ignored

### Execution Readiness

High score:
- paths are concrete or discovery tasks are explicit
- implementation lane is chosen
- handoff gives enough context for a fresh agent
- stop conditions are named

Low score:
- "implement feature" is the main instruction
- no file paths or modules
- no review gates

## Blocking Findings

Block execution when any of these exist:
- no success criteria
- no verification path
- critical ambiguity in core behavior
- destructive or data-affecting change without rollback/backup plan
- conflicting requirements
- plan asks agents to edit overlapping files in parallel
- placeholders remain in required sections

## Vague Terms

These require metrics, examples, or observable checks:

```text
fast, performant, scalable, robust, clean, simple, intuitive, easy,
secure, reliable, production-ready, polished, comprehensive, seamless,
better, optimized, user-friendly, flexible, maintainable
```
