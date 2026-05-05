---
name: commit
description: Stage changes and write a conventional commit message
---

Procedure:
1. Run `git diff --staged` to see what's staged
2. If nothing is staged, run `git status` and propose what to stage
3. Categorize the change: feat, fix, docs, refactor, test, chore
4. Write a commit message following Conventional Commits format:
   - First line: `type(scope): short description` (50 chars max)
   - Blank line
   - Body explaining WHY, not WHAT (the diff shows what)
5. Show me the proposed message before committing
6. After my approval, commit with that message

Do NOT auto-commit. Always show the message first.
