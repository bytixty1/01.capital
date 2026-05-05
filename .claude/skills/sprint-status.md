---
name: sprint-status
description: Summarize the current sprint status from the repo and recent commits
---

Procedure:
1. Read `docs/discovery/14-day-sprint.md` (during discovery) or `docs/product/implementation-plan.md` (post-discovery)
2. Run `git log --oneline -20` to see recent activity
3. Run `git status` to see uncommitted changes
4. Check the most recent ADRs in `docs/decisions/`
5. Summarize:
   - Which sprint we're in
   - What's been completed recently
   - What's blocked or uncommitted
   - What you'd recommend doing next

Output format: a concise status report, no fluff.
