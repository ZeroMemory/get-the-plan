# Task Splitting Patterns

Prefer splits that produce independently useful, testable increments.

## Default: Vertical Slice

Build one complete path through the system:
- data shape if needed
- server/domain logic if needed
- interface/API/UI if needed
- verification

Use when a user-visible workflow can be narrowed.

## Pattern 1: Simplest Complete Path

Start with the simplest case that still exercises the full flow.
Add variants later.

Example:
- first: create a task with a title
- later: due dates, labels, permissions

## Pattern 2: Workflow Step With End-to-End Value

If a workflow has multiple stages, each split should still be complete.
Do not make one task "backend only" and another "frontend only" unless the contract itself is the deliverable.

## Pattern 3: Business Rule Variation

Split by rules:
- admin vs member
- success vs rejected case
- free vs paid account
- simple discount vs complex discount

## Pattern 4: Data Variation

Split by input or entity variation:
- text first, file upload later
- one provider first, more providers later
- one import format first, more formats later

## Pattern 5: Risk Spike

If feasibility is uncertain, create a time-boxed discovery task with a concrete output:
- answer
- prototype
- benchmark
- decision record
- follow-up tasks

Do not mix spike and production implementation in the same task.

## Pattern 6: Contract First

When parallel implementation needs coordination:
1. define contract/types/schema
2. implement each side against the contract
3. integrate

## Pattern 7: Operational Boundary

Split infrastructure or rollout work separately when it can be verified independently:
- feature flag
- migration
- monitoring
- deployment config

## Split Validation

Each split should answer yes to:
- Does it deliver observable value or reduce concrete risk?
- Can it be verified independently?
- Does it avoid overlapping writes with parallel work?
- Can a fresh agent implement it without reading the entire project?
- If this were the only completed task today, would the repo still be in a good state?
