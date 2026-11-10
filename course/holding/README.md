# Tune workshop

This directory is the shared holding area for tunes that are not ready for the
published practice set. Each process adds or edits one file under `items/`, so
parallel work usually touches different files.

## Where it lives

The workshop, the review queue (`course/review/`) and the tune editor live only
in the workshop branch, `claude/tune-workshop-editing-7e81a1`, checked out at
`.claude/worktrees/tune-workshop-editing-7e81a1`. Main is the public site that
students use (GitHub Pages serves it), so none of this is on main, and on main
the queued sample tunes in `course/samples/` are placeholders titled *Withheld*.

- Add, edit and review tunes here, not on main. The tunes may sit in the
  repository (this branch can be pushed to GitHub, and older commits of main
  still hold them); what matters is that they are never published on the site,
  which GitHub Pages builds from main alone. So never merge this branch into
  main.
- Bring main's work in with `git merge main`. Main's removal of the workshop
  (944fe71) is recorded here as merged without its changes, so merges keep the
  workshop whole; do not rebase or squash that commit on main.
- To publish a tune, take only that tune to main: its ABC into the set (and,
  for a withheld sample, back into its placeholder's place in
  `course/samples/`), never the workshop files.

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

Where to read the original goes in one or more lines of its own, a web address
then what it is; the editor and the boards show them as links beside the `S:`
citation (records in the review queue take the same line):

```text
% source-url: https://archive.org/details/musicofhindostan00foxs/page/57/mode/1up archive.org scan, at p. 57
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
