---
name: specs-ship-with-open-questions
description:
  Specs here can carry unresolved OPEN QUESTIONS and unchecked tasks; flag ACs that depend on them
  as blocked, not done
metadata:
  type: project
---

specs/999-smoke-users-list had 4 unanswered open questions (default cap, max/invalid cap response,
UI cap, auth) and 0 tasks done; the cap work (the only new behaviour) was absent from code.

**Why:** pre-existing code can make a spec look implemented while the new delta is missing. **How to
apply:** find the spec's "new behaviour" and verify that first; check backend auth is server-side
(no guards found in apps/api; web gating is client-only cookie/token).
