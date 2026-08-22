# WEDORA final publish hotfix — 2026-08-22

Fixes the two errors shown in the browser:

1. `column reference "status" is ambiguous`
2. `Cannot coerce the result to a single JSON object` / HTTP 406 on invitation PATCH

## Existing Supabase project
Run `sql/FIX-PUBLISH-FINAL.sql` once in Supabase SQL Editor, then deploy this folder.

The builder now saves through `save_invitation_v11` and publishes through `publish_invitation_v11`.
Both RPCs return normal JSON objects and avoid PostgREST single-row coercion.

After deploy, hard refresh the builder once so `builder.js?v=20260822.6` is loaded.
