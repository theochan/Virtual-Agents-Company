# VAC-40 vendored licensing and redistribution audit

VAC-40 is acceptance-complete as an engineering redistribution gate and the Plane work item was closed as Done on 2026-09-24 after its evidence comment was read back. It does not claim legal certification.

## Inventory and provenance

- The vendored `claude-skills/` snapshot contains 5,417 tracked files pinned to upstream commit `19392f7a08264ed00486a251f5b2098321771f94` and local import commit `3b5322f6375157a91b4a56274fac0e06e4f8bf2a`. The working tree is checked for vendor drift before the gate passes.
- Ten complete license-text files are preserved in the snapshot and recorded by path, byte size and SHA-256. They cover the root MIT grant, nested MIT grants, the hivemind Apache-2.0 grant, and the dual MIT notices for the OpenAI-derived deep-RL notes.
- The lockfile inventory records every package path, exact version, SPDX declaration and development/production classification. Direct declared dependencies also carry their installed license-text paths and hashes. Transitive and platform companion notices remain with the exact packages installed by npm from the lockfile. The current 376 entries use only 0BSD, Apache-2.0, BSD-2-Clause, BSD-3-Clause, CC-BY-4.0, ISC, MIT and MPL-2.0.
- Forty exact Unsplash photo identifiers are recorded. The application distributes URL templates, not photo bytes; the separate Unsplash and likeness limitations remain explicit.

## Resolution and release gate

No unknown or restricted material was found in the declared distribution. The full vendor library is excluded from the runtime release. The only embedded vendor source is the separately qualified `meeting-cost-v1` adapter, which includes its unchanged source and full MIT notice. Runtime dependencies are installed from the exact lockfile and retain their package notices.

`npm run check:licenses`, production builds and the publication check now fail if the frozen inventory drifts, a dependency introduces an unreviewed license, required notices disappear, the vendor snapshot changes, or the release allowlist drops a required notice. The release allowlist includes `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `package.json` and `package-lock.json`.

The source and production-bundle suites each passed 215 runnable tests with zero failures and six Docker-only skips. TypeScript, the license gate, publication inventory, production build and whitespace validation passed. A disposable release candidate preserved all five required notice/lock files, excluded the loose vendor tree, and contained the qualified adapter source plus its MIT notice in the bundled server. The existing Vite chunk-size advisory remains unrelated.

## Boundary

This is a reproducible source and release audit, not legal advice. It does not grant rights beyond the preserved licenses, waive trademark or likeness rights, or certify future dependency updates. Any deliberate vendor or dependency change must regenerate and re-review the frozen inventory.

Evidence: [frozen license inventory](../evaluations/2026-09-24-license-inventory.json) and [sanitized acceptance summary](../evaluations/2026-09-24-license-audit-summary.json).
