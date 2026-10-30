# Bugbot Review Instructions

Review this repository like a senior engineer covering security, reliability, UX, backend correctness, database safety, and deployment risk.

Prioritize:

- Auth, authorization, tenant isolation, admin permissions, session handling, token storage, CORS, CSRF, and rate limits.
- Secret exposure, unsafe env handling, hard-coded credentials, private keys, payment keys, webhook secrets, and customer data leaks.
- XSS and HTML injection from innerHTML, document.write, dangerouslySetInnerHTML, template strings, rich text, CMS data, and translated content.
- Money, exchange, invoice, accounting, payment, balance, and CRM workflow correctness, including decimal precision and audit trails.
- Database migrations, indexes, raw SQL, destructive data changes, rollback safety, and idempotent external provider calls.
- UI regressions: broken responsive layouts, inaccessible forms, missing labels, poor loading/error/empty states, and dashboard usability.
- CI, build, lint, test, deployment, Docker, Vercel/server config, env examples, README/runbook gaps, and dependency risk.

Ignore generated output, lockfiles, minified bundles, vendor folders, WordPress core, and third-party plugin source unless the PR explicitly edits them.

When leaving comments, explain the concrete risk, the affected file or flow, and the smallest safe fix. Do not request broad rewrites unless the change is necessary for correctness or security.
