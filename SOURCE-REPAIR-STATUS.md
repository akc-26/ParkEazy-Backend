# ParkEazy source repair status

## Changes made in this revision

1. Removed migration execution from `DatabaseManager.initPgMem()`. The connection layer now creates the development/test adapter only; `MigrationManager` is the single migration execution owner.
2. Changed `server.ts` to stop startup if `MigrationManager.runMigrations()` returns errors.
3. Configured the pg-mem adapter with `noAstCoverageCheck: true` to avoid pg-mem's AST coverage warning rejecting otherwise supported DDL. This does not make pg-mem a full PostgreSQL replacement.
4. Replaced `array_length(affected_bay_ids, 1) > 0` in active migration `011_section_3b_canonical_closures_and_maintenance_backfill.sql` with `affected_bay_ids[1] IS NOT NULL` for the first-array-element test.
5. Added checksum validation for already-applied migration files in `MigrationManager.getMigrationStatus()`.
6. Excluded checkpoint directories and installed dependency folders from the clean source archive. Original checkpoint contents are supplied separately in `ParkEazy-Source-Checkpoints-Preserved.zip`.

## Important verification limitation

The source archive passed ZIP integrity validation. Dependency installation timed out in this environment, so `npm run lint`, `npm test`, `npm run build`, and a complete server startup were not verified in this revision. Do not treat this package as a production-accepted release until those checks pass.

## Structure policy

The folders `apps/admin`, `apps/admin-panel`, `apps/api`, `apps/host`, `apps/host-portal`, `apps/user-website`, and `apps/website` have not been deleted merely because their names appear similar. The root frontend imports `apps/host` and `apps/admin`; the remaining folders require dependency and deployment tracing before safe consolidation. The two checkpoint directories were preserved separately rather than silently discarded.
