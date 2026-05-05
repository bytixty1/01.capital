# Project skills

Slash commands for Claude Code. Triggered by typing `/skillname` in a Claude Code session.

## Available skills

| Command | What it does |
|---------|-------------|
| `/adr` | Write a new Architecture Decision Record using the project template |
| `/check-rules` | Check whether a proposed change violates the project rules |
| `/saudi-law-check` | Verify a feature or data model against the Saudi Companies Law digest |
| `/sprint-status` | Summarize the current sprint status from the repo and recent commits |
| `/commit` | Stage changes and write a conventional commit message (with approval) |

## How they work

Each skill is a markdown file with:
- A `name` (becomes the slash command)
- A `description` (shown in `/help`)
- The body is the prompt Claude follows when invoked

When you type the slash command, Claude loads that file's instructions and executes them.

## Adding a new skill

1. Create `name.md` in this folder
2. Add frontmatter with `name` and `description`
3. Write the procedure as the body
4. Commit. New sessions will see the skill via `/help`.

## Rules for project skills

- Keep them short and procedural
- Cite specific files when relevant (`.agents/rules/`, `docs/...`)
- Don't have skills that auto-write code without showing a draft first
- Don't have skills that bypass the project rules

## Future skills to consider

When the team identifies a repeated workflow that's painful, turn it into a skill. Candidates we've discussed:

- `/interview-summary` — synthesize an interview note into the Pain Points database format
- `/lawyer-question` — draft a question for the legal advisor in the right format
- `/teardown-summary` — summarize a competitive teardown into the synthesis page
- `/release-notes` — generate release notes from CHANGELOG entries since the last tag

Don't build them speculatively. Wait until you've done the workflow manually 3+ times.
