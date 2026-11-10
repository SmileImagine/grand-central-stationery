# Tune workshop

This directory is the shared holding area for tunes that are not ready for the
published practice set. It is deliberately part of the main repository rather
than a separate worktree: each process adds or edits one file under `items/`, so
parallel work usually touches different files.

## Workflow

Each `.abc` file begins with these comment fields:

```text
% holding-id: stable-slug
% holding-status: inbox | transcription | source-check | classroom-check | ready
% holding-owner:
% holding-source-check: pending | verified
% holding-classroom-check: pending | passed
% holding-updated: YYYY-MM-DD
% holding-blocked: what must happen next
```

The status is a kanban column, not a claim that the earlier checks passed.
`ready` is valid only when both checks are complete. Keep provenance and the
uncertainties in the ABC itself; do not put a sketch in `course/samples/` or
`course/set.json`.

After changing an item, run:

```bash
node course/holding/build.js
```

This validates every item and regenerates `index.json`, which powers
`board.html`. Then run `node course/build-sets.js` (or `make sets`, which
runs both) so the library's from-disk copy, `course/sets.js`, carries the
change. CI can use `node course/holding/build.js --check` to detect a
stale board. Serve the repository and open `course/holding/board.html`.

To publish a ready tune, move its ABC into an appropriate sample/source file,
remove the holding metadata, grade it with `analyze-cli.js`, append it to the
practice set, and delete its holding item. Publication is a deliberate review
step; the board never promotes a tune automatically.
