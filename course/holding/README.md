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

A tune can also carry a dossier, what its tradition says it needs, in the same
comment form (all optional; the board shows them under the card):

```text
% dossier-function: game, dance, lullaby, work song, story...
% dossier-elements: rhythm cell, accompaniment idiom, scale or mode, form
% dossier-practice: tempo, who sings or plays what, where the accents fall
% dossier-honesty: traditional | arranged | fusion, and what is ours
% dossier-licence: the source's status and how the notes were taken
% dossier-respect: anything sacred or sensitive, and how to present it
% dossier-review: who should hear it before it is published
```

The teacher's verdict, apart from the stage, and the teacher's answer to the
suggestions (the `holding-blocked` next step, the notes and the dossier):

```text
% holding-decision: include | considering | reject   (absent means considering)
% holding-decision-note: why; a reject needs one
% holding-response: the teacher's answer; one line each, as many as it takes
% holding-response-updated: YYYY-MM-DD
```

A session picking up a tune reads `holding-response` first: it is the teacher
answering what the last session suggested.

The status is a kanban column, not a claim that the earlier checks passed.
`ready` is valid only when both checks are complete. Keep provenance and the
uncertainties in the ABC itself; do not put a sketch in `course/samples/` or
`course/set.json`.

## Editing in the browser

`course/editor.html` opens any record here or in the review queue: the whole
file in a text box with its notation drawn beside it, Include / Under
consideration / Reject with a note, the suggestions with a box for your
response, and the stage and checks. Its controls write their lines into the
file text, so what you see is what is saved. Saving needs the local server:
double-click `serve.command` (or run `node serve.js`), which writes the file,
runs `build.js` and `build-sets.js`, and undoes the save if validation fails.
If another session changed the file since you opened it, the editor asks
before overwriting. The boards' **Edit** links open it on that tune.

After changing an item by hand, run:

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
