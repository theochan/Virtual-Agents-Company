# Local backup and recovery checklist

Human-review reference prepared by Codex, not an accepted agent output. Checked against [SQLite's Online Backup API documentation](https://sqlite.org/backup.html) and [WAL documentation](https://sqlite.org/wal.html) on 2026-09-07. The agent's search receipts contain excerpts; a cited excerpt is not proof that the whole page was inspected.

1. Confirm the scheduled snapshot completed and check its timestamp, checksum sidecar and database integrity result. Use a consistent SQLite snapshot. The running main database alone can omit committed changes held in its WAL.
2. Confirm the owner's cloud sync includes completed snapshot files. Cloud upload and restoration have not yet been verified; local snapshots alone do not establish disk-loss recovery.
3. Stop the identified application before switching its data. Preserve the existing directory. Verify the chosen snapshot's checksum and integrity, then restore it as `workspace.sqlite` in a new private directory without stale WAL/SHM files.
4. Supply compatible application configuration and separately stored API keys. Start the compatible release on a temporary local port, sign in, inspect records and pending approvals, and complete a new verification task before switching service use.

This document gives a procedure. It does not claim to have performed cloud restoration or authorize blind retries of uncertain operations.
