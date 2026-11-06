# EYUF Prep Lab 2.0 — approved decisions

Record of what the user approved, so planning is not restarted. Newest last.

| Date | Decision |
|---|---|
| 2026-11-06 | Build from scratch. No code or data from the previous app. |
| 2026-11-06 | Highlighted answers in old-app screenshots are ignored; every question is re-solved from scratch. |
| 2026-11-06 | "Logika bazza" docx (106 generic images) is skipped for now. |
| 2026-11-06 | New questions come from rule-based generators and the books the user uploads, not from free AI generation. |
| 2026-11-06 | PUZA IQ (2018) is a secondary source. Its key is reliable but not perfect (one likely error found: Karşılaştırma T1 Q4). Book items are scored only when our solve and the key agree. |
| 2026-11-06 | Cube counting, cube nets and fine visual odd-one-out are drawn by code with a computed answer, never copied from scans. |
| 2026-11-07 | MVP scope: practice, exam simulator, mistakes notebook (review after 1, 3, 7 days), dashboard, report-a-question. Deferred: AI tutor, challenge mode, admin panel. |
| 2026-11-07 | Exam simulator default: 30 questions, 60 minutes (2024 format reported by Daryo, not an official spec). Adjustable. |
| 2026-11-07 | EYUF screenshot items with status "verified" are scored now (user's choice, single-source answers). |
| 2026-11-07 | No login. Anyone with the link can use the site and see progress. |
| 2026-11-07 | Stack: Next.js + TypeScript on Livops (native preset), new small Livops Postgres. No AI API in the MVP. |
| 2026-11-07 | Deploy to Livops only after the user approves the tested build. |

## Question-quality policy

- A question is scored only when its answer is backed by two independent sources: a generator's computed answer plus an automated check, or the book key plus an independent solve. Exception: EYUF screenshot items (user decision above).
- Every generator has an independent verifier: it re-derives the answer from what is shown, and checks that no other rule in its library fits the examples with a different answer. Seeds that fail are discarded.
- A reported question leaves scoring until reviewed.
