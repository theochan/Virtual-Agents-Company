# Swarm release validation — 2026-09-21

This release adds bounded static/dynamic/hybrid swarms, recursive profiles, dependency scheduling, public browser automation, versioned files and document sandboxing, reviewed memory, skills/routines, typed connectors and the experimental Deep Agents planner. See the README and architecture guides for use and limits.

Final runtime source fingerprint tested before publication: `25d2fb020e317f256495c8dd94318c60143dacc7651908dd9b432427a44fbb03`. The full owner-planned workflow was evaluated on the preceding execution-kernel build `61530ea613397fd0e50ecfa77dee6c9ceb4f22e74e9251579a91affa329dd123`; subsequent changes add the opt-in harness and its validation. Publication edits update documentation, sanitize evidence and order CI browser installation before backend browser tests.

- 118 backend/integration tests passed with Docker enabled, no skips; 15 UI tests passed.
- Real local Qwen3.5:9b completed all 12 checks of the explicit-plan synthetic sales workflow in 376.39 seconds: all 11 registry tools, nested/saved workers, dependencies, peer review, artifacts, memory, browser profile, exact approved local connector write, skill and paused routine.
- Installed nested explicit-plan execution and a completed one-shot routine passed.
- Fresh-input installed harness workflow passed with seven total model calls: a generated plan, report specialist, JSON/DOCX/XLSX/PPTX/PDF outputs and independent arithmetic. Downloaded hashes, Office content and summary values were independently checked (revenue 600, cost 360, profit 240, three rows).
- Four complex harness trials failed. Invalid hierarchy/inherited grants and unsuccessful corrections exhausted planning context or the four-call planning cap. No successful complex autonomous result is claimed.
- A smaller reused-project harness trial also failed: earlier files were mistaken for sufficient evidence and required execution was omitted. Current-run artifact contracts prevented false acceptance. The fresh-input success does not erase this failure.

Deep Agents remains experimental; native planning is the default. Full autonomous and product parity qualification remains open. The connector in the scenario was synthetic, not an authenticated business service. Search/browser evidence concerns documentation domains, not external sales facts. All test-generated schedules were completed one-shot runs or paused.

[Machine-readable summary](../evaluations/2026-09-21-swarm-release.json). Earlier evaluation files are sanitized historical summaries; operational dumps and private paths are excluded from publication.
