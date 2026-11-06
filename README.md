# Get The Plan

Turn a development request into a Codex plan with ordered tasks, observable acceptance criteria, risk checks and a handoff for the next session.

## Install in Codex

1. Copy the repository to your project's `plugins/get-the-plan` directory.
2. Register `./plugins/get-the-plan` in the project's `.agents/plugins/marketplace.json`.
3. Follow the [local installation instructions](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually) to add the marketplace and install the plugin. Then invoke `get-the-plan` in a Codex chat.

The plugin includes `get-the-plan`, `deep-plan-interview`, `plan-review` and `execution-handoff`.

## Plan a project from the CLI

Use Node.js 18 or later. Run these commands from the plugin directory and select your project.

```bash
read -r -p 'Project directory: ' project_root
node scripts/repo-scan.js --root "$project_root" --json
node scripts/init-plan.js --root "$project_root" --title "Feature name" --slug feature-name --mode deep --json
node scripts/planlint.js "$project_root/.plans/feature-name" --json --fail-on high
```

`init-plan` creates `context.md`, `brief.md`, `plan.md`, `tasks.md`, `critique.md`, `handoff.md` and `state.json`. Add repository evidence and checks before linting. Use `--force` to replace existing plan files.

`planlint` checks plan structure and reports `BLOCK` for critical findings, `REVISE` for high findings and `APPROVE` otherwise. The default exit gate is critical; use `--fail-on high` before execution.
