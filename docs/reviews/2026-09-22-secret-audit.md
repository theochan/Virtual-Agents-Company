# VAC-41 Git history and release secret audit

The dated audit is complete with no confirmed credential exposure. This meets VAC-41's scan, triage and disclosure requirements; it does not certify exhaustive absence of secrets.

On 22 September 2026, all advertised origin refs/tags were fetched without pruning local refs. The repository was not shallow. Gitleaks 8.30.1 scanned all available refs, including local checkpoint refs, with fully redacted reporting. A second scan used default rules, an empty fingerprint-ignore file and ignored inline allow comments. Both reported zero findings. The existing scanner archive matched its saved official release checksum, and the executable matched the archive's executable byte-for-byte. A deliberately invalid generated credential-shaped detection control produced one finding as expected; no real credential was used for the control.

The runtime release allowlist in `scripts/release.mjs` was exported independently: built assets, package manifests, notices/license and the three approved operational scripts. All 14 files were hashed and scanned with default rules and no finding. No working data, environment files, Git history or arbitrary vendored script was added to the release. Private redacted scan reports, logs and the exact release manifest were retained outside the repository.

No candidate required exposure triage, revocation or rotation, and no public-history rewrite was performed. The existing exact fixture exclusions were not widened. Neither a zero finding count nor earlier reviewed exclusions establish that every possible credential format is detected. Coverage excludes unreachable/deleted remote objects, inaccessible forks, external logs and private runtime data. New code or builds require another scan.

The [sanitized receipt](../evaluations/2026-09-22-secret-audit.json) records the exact HEAD, scanner hashes, ref/commit counts and release-manifest hash. This audit closes a dated investigation, not a permanent security guarantee or overall product qualification.

After recovery implementation, the final tracked/proposed source export and rebuilt release allowlist were scanned again with zero findings. The source scan retained the repository's exact reviewed fixture configuration; the release scan used default rules without fingerprint exclusions. Final build source hash: `41f21673094de0213eb27cae40bf5e021f3a22d6b70f2ae621acc5f86d2d4764`. No exclusions were broadened.
