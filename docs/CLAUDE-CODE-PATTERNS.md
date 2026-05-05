# Working with Claude Code on ZeroCaps

> Patterns for getting good work out of Claude Code (or any agentic IDE) on this project. Memory limitations mean you'll need to re-orient the agent at the start of every session — these patterns make that fast and effective.

---

## The session lifecycle

Every Claude Code session has four phases. Skipping phases produces bad output.

### Phase 1 — Orient (always)

The agent has no memory of previous sessions. It needs context.

- **First session ever:** paste the bootstrap prompt from `CLAUDE-CODE-BOOTSTRAP.md`
- **Subsequent sessions:** if the agent doesn't auto-read `CLAUDE.md`, tell it explicitly: "Read `CLAUDE.md` and the four documents it references before starting."
- **Wait for confirmation.** Make the agent summarize back what it read. If the summary is wrong, correct it before letting it touch code.

### Phase 2 — Scope

State the task with constraints.

**Bad:**
> "Add user authentication."

**Good:**
> "Add JWT-based auth to the backend. Use the existing `bcrypt` and `PyJWT` dependencies in `requirements.txt`. Match the patterns in the FastAPI scaffold. Don't introduce new libraries. We're in Sprint 0, so this is the only auth work — no role-based authorization yet."

The "Bad" version forces the agent to make ten decisions you didn't make. The "Good" version locks the constraints upfront.

### Phase 3 — Execute

Let the agent work. Watch for these failure modes:

- **Scope creep:** agent starts adding "while I'm here" features. Stop it. Force focus.
- **Convention drift:** agent uses different patterns from existing code. Ask it to match `app/main.py` style.
- **Speculative abstraction:** agent creates `BaseRepositoryFactory` for one model. Reject; demand the simplest thing.
- **Skipping tests:** agent writes 200 lines without a test. Ask explicitly for tests.

### Phase 4 — Review

Before any commit:

1. Read the diff yourself
2. Run the tests
3. Run the linter / type-checker
4. Spot-check that the agent didn't break unrelated code
5. Make sure the commit message follows convention

If anything is off, ask the agent to fix it before committing. Don't accumulate technical debt because "we'll clean it up later."

---

## Session prompt patterns (copy-paste ready)

### Pattern A — Implementing a planned feature

```
Task: [feature name from implementation plan or sprint]

Context:
- We're in Sprint [N], working on [theme]
- The relevant ADR is: [link or "none yet — write one"]
- The relevant law digest section is: [section letter or "none"]

Constraints:
- Match existing patterns in [reference file]
- Don't introduce new dependencies
- Tests required: [yes/no, what kind]
- ADR required: [yes/no]

Acceptance criteria:
1.
2.
3.

Start by re-reading the relevant law digest section and existing code, 
then propose your approach before writing code. Do not write code until 
I approve the approach.
```

### Pattern B — Fixing a bug

```
Bug: [description]

Where: [file paths or area]

Reproduce: [steps to reproduce]

Expected: [what should happen]

Actual: [what's happening]

Constraints:
- Smallest possible fix
- Add a regression test
- Don't refactor surrounding code unless directly related

Investigate first. Tell me what you found before proposing a fix.
```

### Pattern C — Refactoring

```
Refactor: [target area]

Why: [the actual reason — performance? readability? maintainability?]

Scope:
- Allowed: [specific files/modules]
- Not allowed: [specific files/modules]

Constraints:
- Behavior must not change (existing tests must continue passing)
- No new dependencies
- No new abstractions unless they replace something demonstrably worse

Propose the change as a list of small, independent steps. We'll review 
the plan before any code changes.
```

### Pattern D — Reading and understanding

```
I need to understand [area of the codebase / a specific concept from the law].

Read [specific files] and explain to me:
1.
2.
3.

Don't write code. Just explain. Cite specific lines or article numbers 
in your explanation.
```

### Pattern E — Writing an ADR

```
Write ADR-[NNNN]: [Title]

Decision context: [what's being decided and why now]

Constraints to consider:
- [project rule from .agents/rules/]
- [legal constraint from law digests]
- [technical constraint]

Use the template at docs/decisions/TEMPLATE.md. Be specific. Cite sources.

Don't propose. Write the ADR as if the decision is made — but mark Status 
as "Proposed" so I can review and accept.
```

---

## Anti-patterns (don't do these)

### "Just figure it out"
Vague prompts produce vague output. The agent will pick the path of least resistance, which is usually the wrong path for a compliance-grade product.

### Letting it work for 30+ minutes without check-in
Long autonomous runs in Claude Code drift. Check in every 10-15 minutes. Verify direction.

### Trusting the agent's reading of the law
The agent has read the law digest, but it does not understand the law. When it makes a claim like "Article 113 says X," verify against the digest yourself.

### Skipping the orient phase because "it should remember"
It doesn't. Every. Single. Session. Re-orient or accept bad output.

### Asking for "the best implementation"
There's no such thing. Ask for "the implementation that matches our existing patterns and our project rules." Specificity beats sophistication.

### Ignoring the agent's pushback
If the agent says "this conflicts with the project rules" or "this would require an ADR" — listen. It's reading the rules you wrote. Don't override casually.

---

## Working as a team with one agent

Three of the four founders aren't engineers. Here's how to coordinate:

- **Abdulelah owns code-side agent interactions.** Other founders should not give Claude Code coding tasks directly without coordinating.
- **Yosef and Ali can give the agent reading/synthesis tasks** (e.g., "summarize what's in `docs/discovery/`" or "write a status update based on what's been committed this week"). Read-only tasks are safe.
- **Mohammed can give the agent design-system tasks** (e.g., "update the brand tokens in `frontend/src/app/globals.css` to add a warning state color"). Surface-level frontend work is safe with clear constraints.

Coordinate in Notion. Agree on who's running an agent session and what they're working on. Two founders running parallel agent sessions on the same files = merge conflicts.

---

## When the agent gets stuck

Common failure modes and fixes:

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "I cannot find file X" | Agent's path resolution is off | Give it the full path from repo root |
| Repeats the same wrong fix | It's not testing its changes | Ask it to run the test/build and read the error |
| Generates code that doesn't compile | Skipped type-checking | Ask it to run `tsc --noEmit` or `pytest` after each change |
| Writes verbose, abstract code | Vague prompt | Use Pattern A above with explicit constraints |
| Refuses a reasonable task | Misreading the rules | Quote the specific rule it's citing; clarify |
| Adds emojis or "✨" everywhere | Default behavior | Tell it explicitly: "no emojis, no decorative characters" |

If stuck for more than 15 minutes: end the session, re-orient, and try a tighter, smaller task.

---

## Closing the session

End every session by:

1. Reviewing the diff
2. Running tests + lint + type-check
3. Committing with a proper conventional message
4. Updating `CHANGELOG.md` if the change is user-visible
5. Closing the chat (don't leave it open and forget context)

Do not leave uncommitted changes hanging overnight. The next session won't remember what you were doing.

---

## When to escalate to a strategic conversation (with me, in regular Claude chat)

Claude Code is good at implementation. It is not the right tool for:

- Strategic decisions (product direction, hiring, fundraising)
- Customer discovery synthesis
- Legal/regulatory interpretation
- Pitch deck content
- Anything requiring sustained context across days

For those, paste relevant context into a regular Claude chat (this product, not Code) and have a strategic conversation. Then bring the conclusions back to Code as a clear scoped task.

---

This file last updated: 2026-05-05. If significantly out of date or if you've found patterns that work better, update it.
