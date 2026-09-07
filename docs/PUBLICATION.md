# Public repository release review

Reviewed 2026-09-07. Intended audience: an experimental local, single-owner workspace, not a hosted autonomous company. Publishing source and declaring business accuracy are separate decisions.

## Scope and findings

- Gitleaks 8.30.1, downloaded from its official release and SHA-256 verified, scanned all reachable Git history with `git --log-opts=--all`. No credential findings. A separate candidate-directory scan found 19 upstream instructional/test matches; each was classified and narrowly allowed by exact path AND exact line in `.gitleaks.toml`. No directory-wide exclusions were added to Gitleaks. See `docs/secret-scan-classifications.json`. The reviewed candidate scan passed; repeat against the final commit.
- A separate Git-object privacy inventory found two examples in public branch history: `external@gmail.com` in upstream mail troubleshooting and `192.168.1.0/24` in an upstream redaction checklist. These are instructional examples, not operator records. Private runtime directories and credential files are absent from public branch history.
- Local Codex checkpoint refs contain earlier operational evidence with operator paths. Those local refs are not part of `main` and must not be mirror-pushed. This review does not delete local checkpoints or rewrite history.
- Existing commit author metadata includes the maintainer name and a local-machine email/hostname. It is not an access credential. Publishing existing history exposes that attribution; this review does not rewrite authorship.
- First-party operational JSON files are now explicitly labeled sanitized summaries. Exact originals are retained in ignored, private `data/publication-originals/`; public summaries carry original SHA-256 hashes. Raw workspace records, identifiers and model/tool payloads are omitted. Historical report hashes refer to the private originals, not the summaries. Machine-specific paths in prose are replaced with placeholders.
- All 5,417 tracked vendor files match upstream `alirezarezvani/claude-skills` commit `19392f7a08264ed00486a251f5b2098321771f94` by Git blob hash. All ten license files (root and nine nested notices) are preserved. See `THIRD_PARTY_NOTICES.md`. The inventory now pins the revision. The two vendor ZIPs contain twelve skill/reference/script files; they were separately unpacked for secret inspection, without executing them. The vendor icon and ZIPs also match the upstream snapshot. No operator books or generated assets were added.
- The stock portrait catalog references externally hosted photographs, with existing attribution/rights limitations retained. Root Apache-2.0 does not relicense third-party materials.
- `SECURITY.md` adds private-reporting guidance and an honest fallback if GitHub private vulnerability reporting is unavailable. No private reporting setting is claimed enabled by this change.

## Reproducible gates

Use Node 24 and a fresh checkout containing only committed files:

```
npm ci
npm run check:publication
npm run check
npm run test:production
npx playwright install --with-deps chromium --only-shell
npm run test:browser
npm audit --audit-level=moderate
npm run skills:inventory
git diff --exit-code -- docs/skill-inventory.json
gitleaks git . --log-opts=--all --redact=100
```

CI contains these source/build/browser/inventory/audit gates and a pinned full-history Gitleaks job. Local execution does not prove a GitHub-hosted run passed. Remote CI requires an authorized push of the committed release; repository visibility remains private until separately changed by the owner.

## Product boundary

The restored Team canvas retains portraits, curved connectors, amber root treatment, zoom and department filtering, while displaying real hierarchy, actual autonomy levels and direct-report counts. Reporting and delegation controls are secondary disclosures inside cards. Child-run permission checks and exact-operation approvals remain enforced. Successful tasks now complete automatically; users provide feedback in chat.

Research correctness, freshness selection and measured owner benefit remain open. Public documentation must retain those limitations and the preserved negative evaluation outcomes.

## Local validation result

A fresh export of the staged candidate passed installation, publication inventory, TypeScript, build, all 52 source tests, all 52 built-server tests, eight browser tests, zero-vulnerability npm audit and deterministic skill inventory regeneration. The Team canvas screenshot was visually inspected. No private data or credentials were copied into the clean checkout. GitHub-hosted CI is pending an authorized push; no successful remote run is claimed.

The reviewed implementation is committed as `ea3fd34`. Local release `459dccf096da` is installed, its runtime assets exactly match the tested clean export, and live Team rendering was verified. Existing records and all 30 quarantined records were preserved. Sanitized installation evidence: `docs/evaluations/2026-09-07-team-restoration-installed.json`. The working release has not been pushed and repository visibility has not been changed.


## Current publication follow-up

The previously pending release was pushed to main and passed GitHub CI. The current follow-up adds automatic completion, specialist routing with Audit reasons, delegated work items, unlimited daily search configuration, synchronized agent model settings, and chat/navigation fixes. README and operational instructions describe the current behavior; older dated evaluation observations remain historical evidence. Local runtime data, private installation reports and credentials remain ignored. The next push must pass the same CI gates before changing visibility.

The final staged follow-up was exported without private runtime files and validated with fresh dependencies: 58 source tests, 58 built-server tests and 10 browser tests passed; npm audit reported zero vulnerabilities. The deterministic vendor inventory was unchanged. Gitleaks 8.30.1 found no leaks in reachable history or the staged candidate using the existing narrowly reviewed fixture allowances. Publication inventory checked 5,545 tracked files. Private vulnerability reporting could not be confirmed through the GitHub API; the SECURITY.md fallback remains applicable. Remote CI for the follow-up is the remaining post-push verification.
