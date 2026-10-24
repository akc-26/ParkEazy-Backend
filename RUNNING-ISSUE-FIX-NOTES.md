# ParkEazy running issue fix notes

Scope: startup failure in migration 011 under the project's pg-mem development/test adapter.

Changes:
- Removed two `UPDATE ... FROM` host-id backfills that pg-mem rejects.
- Removed the procedural `DO $$` legacy maintenance-block backfill from this portable migration because pg-mem does not support that block consistently.
- Preserved existing host IDs and legacy maintenance data; no records are deleted.

Important limitation:
- This change targets the reported startup blocker. The full server startup and test suite were not executed in this packaging environment because dependency installation timed out. Do not treat this note as proof of a successful startup.
- The legacy `maintenance_blocks` data backfill must be handled separately in a real PostgreSQL migration after verifying the exact source schema.
